import { inject } from "vitest";
import { createDb } from "../src/db/client";

export { truncateAll } from "./truncate";

export function connectTestDb() {
  return createDb(inject("testDatabaseUrl"));
}
