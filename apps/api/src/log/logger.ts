export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

type Fields = Record<string, unknown>;

export type Logger = Record<LogLevel, (msg: string, fields?: Fields) => void>;

const MAX_STRING = 4096;

// No regex here can backtrack, so redaction is linear in the input; a lazy
// scan-then-match pattern was quadratic on inputs like "a.a.a…" and stalled
// the event loop on every request with a long path.
const SEPARATOR = /[?#]|%3f|%23/i;
const URL_LIKE = /[/.:]/;

// A token is cut at its first ?, #, %3F or %23 when the text before it looks
// like a URL or path, or when it starts with ? / %3F. Over-cutting non-URL text
// like "10:30?" only trims log text; under-cutting leaks tokens.
// shortcut: still leaks an unencoded space inside a query ("?q=a SECRET"),
// a fully encoded standalone URL ("https%3A%2F%2Fh%2Fp%3Ft"), a double-encoded
// separator (%253F), and scheme-less userinfo ("user:pass@host").
function cutQuery(token: string): string {
  const match = SEPARATOR.exec(token);
  if (!match) return token;
  const prefix = token.slice(0, match.index);
  const leadingQuery = match.index === 0 && !match[0].startsWith("#") && match[0] !== "%23";
  return URL_LIKE.test(prefix) || leadingQuery ? prefix : token;
}

function maskUserinfo(token: string): string {
  const schemeEnd = token.indexOf("://");
  if (schemeEnd === -1) return token;
  const authStart = schemeEnd + 3;
  const rest = token.slice(authStart);
  const authEnd = rest.search(/[/?#]/);
  const authority = authEnd === -1 ? rest : rest.slice(0, authEnd);
  const at = authority.lastIndexOf("@");
  if (at === -1) return token;
  const userinfo = authority.slice(0, at);
  const colon = userinfo.indexOf(":");
  const masked = colon === -1 ? "***" : `${userinfo.slice(0, colon)}:***`;
  return token.slice(0, authStart) + masked + rest.slice(at);
}

export function redactUrls(text: string): string {
  const capped = text.length > MAX_STRING ? `${text.slice(0, MAX_STRING)}…` : text;
  return capped
    .split(/(\s+)/)
    .map((part) => cutQuery(maskUserinfo(part)))
    .join("");
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
    // Any failure here (a throwing getter or toJSON) is handled the same way:
    // a log call must never throw, or onError would lose the real error.
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
