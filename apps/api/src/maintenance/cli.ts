import { importPostgresFile } from "./import-postgres";
import { backupDatabase, configuredDatabasePath, restoreDatabase, validateDatabase } from "./backup";
import { MaintenanceError } from "./errors";

async function main() {
  const [command, source, destination] = process.argv.slice(2);
  if (command === "backup-current" && source && !destination) {
    await backupDatabase(configuredDatabasePath(), source);
    process.stdout.write("Verified snapshot of the configured database created.\n");
  } else if (command === "check" && source && !destination) {
    validateDatabase(source);
    process.stdout.write("Database integrity and references verified.\n");
  } else if (command === "import-postgres" && source && destination) {
    process.stdout.write(JSON.stringify(await importPostgresFile(source, destination)) + "\n");
  } else if ((command === "backup" || command === "restore") && source && destination) {
    await (command === "backup" ? backupDatabase : restoreDatabase)(source, destination);
    process.stdout.write("Verified database snapshot created.\n");
  } else {
    throw new MaintenanceError("Usage: maintenance <import-postgres|backup|restore> <source> <new-destination>; maintenance backup-current <new-backup>; maintenance check <database>");
  }
}

main().catch((error: unknown) => {
  // Drivers may include SQL parameters in errors. Print no imported data.
  process.stderr.write(error instanceof MaintenanceError ? error.message + "\n" : "Database maintenance failed; destination was not published.\n");
  process.exitCode = 1;
});
