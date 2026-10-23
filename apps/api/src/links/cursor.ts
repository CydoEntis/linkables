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

// No sort key: it can be a saved URL with its query string, and cursors end up in
// request logs and browser history. The key is looked up per page; k is a
// fingerprint of it that shows whether the link was renamed since.
const titleCursorSchema = z.strictObject({
  sort: z.literal("title"),
  id: z.uuid(),
  k: z.string().regex(/^[\w-]{16}$/),
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
