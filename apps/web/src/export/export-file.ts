import type { ExportResponse } from "@linkables/shared/export";

// exportedAt is UTC, so the date in the name is the UTC day, matching the file's own timestamp.
export function exportFileName(exportedAt: string): string {
  return `linkables-export-${exportedAt.slice(0, 10)}.json`;
}

// The file is the export itself, not the API envelope around it.
export function exportBlob(data: ExportResponse): Blob {
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}
