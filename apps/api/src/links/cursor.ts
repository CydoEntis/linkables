import type { LinkSort } from "@linkaroo/shared/links";
import { z } from "zod";
import { ValidationError } from "../http/errors";

// savedAt keeps Postgres' microseconds: a millisecond Date would skip rows saved
// within the same millisecond as the last row of a page.
const savedAtCursorSchema = z.strictObject({
  sort: z.enum(["newest", "oldest"]),
  // Postgres has no year 0, so the ::timestamptz cast would throw a 500.
  savedAt: z.iso.datetime({ precision: 6 }).refine((value) => !value.startsWith("0000-")),
  id: z.uuid(),
});

// title is the row's sort key itself, not a hash, because the next page compares
// rows against it. The longest key is a 2048-byte URL, so a cursor stays under 3 KB.
const titleCursorSchema = z.strictObject({
  sort: z.literal("title"),
  // Postgres text cannot hold NUL, so a forged one would fail the query with a 500.
  title: z.string().refine((value) => !value.includes("\u0000")),
  id: z.uuid(),
});

const cursorSchema = z.discriminatedUnion("sort", [savedAtCursorSchema, titleCursorSchema]);

export type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function invalidCursor(message: string): ValidationError {
  return new ValidationError(message, { fieldErrors: { cursor: message } });
}

export function decodeCursor(token: string, sort: LinkSort): Cursor {
  const parsed = cursorSchema.safeParse(parseJson(Buffer.from(token, "base64url").toString("utf8")));
  if (!parsed.success) throw invalidCursor("Invalid cursor");
  if (parsed.data.sort !== sort) throw invalidCursor("Cursor belongs to a different sort");
  return parsed.data;
}
