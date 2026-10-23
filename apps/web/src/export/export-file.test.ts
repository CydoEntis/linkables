import { exportResponseSchema, type ExportResponse } from "@linkables/shared/export";
import { describe, expect, it } from "vitest";
import { exportBlob, exportFileName } from "./export-file";

const data: ExportResponse = {
  version: 1,
  exportedAt: "2026-10-22T23:30:00.000Z",
  links: [
    {
      canonicalUrl: "https://example.com/a",
      originalUrl: "https://example.com/a?utm=x",
      title: "A page",
      titleOverride: null,
      note: "line one\nline two",
      pinned: true,
      savedAt: "2026-10-20T08:00:00.000Z",
      collectionIds: ["0b0a7c86-6c0e-4f62-9d0c-5c7e2f6b1a11"],
    },
  ],
  collections: [{ id: "0b0a7c86-6c0e-4f62-9d0c-5c7e2f6b1a11", name: "Reading", createdAt: "2026-10-01T08:00:00.000Z" }],
};

describe("export file", () => {
  it("is named after the day the export was made", () => {
    expect(exportFileName(data.exportedAt)).toBe("linkables-export-2026-10-22.json");
  });

  it("holds the export data as JSON that parses back to the same export", async () => {
    const blob = exportBlob(data);
    expect(blob.type).toBe("application/json");
    const parsed = exportResponseSchema.parse(JSON.parse(await blob.text()));
    expect(parsed).toEqual(data);
  });
});
