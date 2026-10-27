
import { migrateE2eDatabase } from "./database";

export default async function globalSetup() {
  await migrateE2eDatabase();
}
