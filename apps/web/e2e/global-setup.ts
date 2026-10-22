import { migrateTestDb, testDatabaseUrl } from "../../api/test/db-setup";

export default async function globalSetup() {
  await migrateTestDb(testDatabaseUrl());
}
