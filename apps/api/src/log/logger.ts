export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

type Fields = Record<string, unknown>;

export type Logger = Record<LogLevel, (msg: string, fields?: Fields) => void>;

// A URL (scheme://… or a /path) followed by its query and/or fragment. Over-
// matching a non-URL "/a?b" only trims log text; under-matching leaks tokens.
const URL_WITH_SUFFIX = /((?:\b[a-z][a-z\d+.-]*:\/\/|\/)[^\s"<>?#]*)[?#][^\s"<>]*/gi;

export function redactUrls(text: string): string {
  return text.replace(URL_WITH_SUFFIX, "$1");
}

function redactValue(_key: string, value: unknown): unknown {
  if (typeof value === "string") return redactUrls(value);
  if (value instanceof Error) {
    const { name, message, stack, cause } = value;
    return { ...Object.fromEntries(Object.entries(value)), name, message, stack, cause };
  }
  return value;
}

function writeStdout(line: string) {
  process.stdout.write(`${line}\n`);
}

export function createLogger(level: LogLevel, write: (line: string) => void = writeStdout): Logger {
  const threshold = LOG_LEVELS.indexOf(level);
  const log = (entryLevel: LogLevel) => (msg: string, fields?: Fields) => {
    if (LOG_LEVELS.indexOf(entryLevel) < threshold) return;
    const entry = { time: new Date().toISOString(), level: entryLevel, msg, ...fields };
    write(JSON.stringify(entry, redactValue));
  };
  return { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") };
}
