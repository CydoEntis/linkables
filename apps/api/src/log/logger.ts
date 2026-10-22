export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

type Fields = Record<string, unknown>;

export type Logger = Record<LogLevel, (msg: string, fields?: Fields) => void>;

const USERINFO = /(\b[a-z][a-z\d+.-]*:\/\/)([^\s/?#]*)@/gi;

// A URL start (scheme://, /path, or a dotted host with optional port) up to
// its first ?, #, %3F or %23, then the rest of the token. Over-matching
// non-URL text like "a/b?c" only trims log text; under-matching leaks tokens.
// shortcut: the suffix ends at whitespace, so an unencoded space inside a
// query ("?q=hello SECRET") still leaks what follows it. Real URLs reaching
// the logger come from URL/Request objects, which encode spaces.
// shortcut: opaque schemes without a dotted host ("urn:x?y") are not stripped.
const URL_WITH_SUFFIX =
  /(\b[a-z][a-z\d+.-]*:\/\/\S*?|\/\S*?|\b[a-z\d-]+(?:\.[a-z\d-]+)+(?::\d+)?)(?:[?#]|%3f|%23)\S*/gi;

const LEADING_QUERY = /(?<=^|\s)(?:\?|%3f)\S*/gi;

function maskUserinfo(_match: string, scheme: string, userinfo: string): string {
  const colon = userinfo.indexOf(":");
  return colon === -1 ? `${scheme}***@` : `${scheme}${userinfo.slice(0, colon)}:***@`;
}

export function redactUrls(text: string): string {
  return text.replace(USERINFO, maskUserinfo).replace(URL_WITH_SUFFIX, "$1").replace(LEADING_QUERY, "");
}

function hasToJson(value: object): value is { toJSON: () => unknown } {
  return typeof (value as { toJSON?: unknown }).toJSON === "function";
}

function errorEntries(error: Error): [string, unknown][] {
  const { name, message, stack, cause } = error;
  return [...Object.entries(error), ["name", name], ["message", message], ["stack", stack], ["cause", cause]];
}

function sanitizeObject(value: object, ancestors: WeakSet<object>): unknown {
  if (value instanceof Error) return sanitizeEntries(errorEntries(value), ancestors);
  if (Array.isArray(value)) return value.map((item: unknown) => sanitize(item, ancestors));
  if (hasToJson(value)) return sanitize(value.toJSON(), ancestors);
  return sanitizeEntries(Object.entries(value), ancestors);
}

function sanitizeEntries(entries: [string, unknown][], ancestors: WeakSet<object>) {
  return Object.fromEntries(entries.map(([key, item]) => [redactUrls(key), sanitize(item, ancestors)]));
}

function sanitize(value: unknown, ancestors: WeakSet<object>): unknown {
  if (typeof value === "string") return redactUrls(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object" || value === null) return value;
  if (ancestors.has(value)) return "[Circular]";
  ancestors.add(value);
  const sanitized = sanitizeObject(value, ancestors);
  ancestors.delete(value);
  return sanitized;
}

function serialize(level: LogLevel, msg: string, fields: Fields | undefined): string {
  const head = { time: new Date().toISOString(), level, msg: redactUrls(msg) };
  try {
    return JSON.stringify({ ...(sanitize(fields ?? {}, new WeakSet()) as Fields), ...head });
  } catch {
    // A log call must never throw: inside onError that would lose the real error.
    return JSON.stringify({ ...head, error: "serialization failed" });
  }
}

function writeStdout(line: string) {
  process.stdout.write(`${line}\n`);
}

export function createLogger(level: LogLevel, write: (line: string) => void = writeStdout): Logger {
  const threshold = LOG_LEVELS.indexOf(level);
  const log = (entryLevel: LogLevel) => (msg: string, fields?: Fields) => {
    if (LOG_LEVELS.indexOf(entryLevel) < threshold) return;
    write(serialize(entryLevel, msg, fields));
  };
  return { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") };
}
