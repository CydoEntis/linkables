import { createApp, type AppDeps } from "../src/app";
import { createLogger, type LogLevel } from "../src/log/logger";

export function captureLogger(level: LogLevel = "debug") {
  const lines: string[] = [];
  return { logger: createLogger(level, (line) => lines.push(line)), lines };
}

export function createTestApp(deps: Partial<AppDeps> = {}) {
  return createApp({ logger: captureLogger().logger, corsOrigins: ["http://localhost:5173"], ...deps });
}
