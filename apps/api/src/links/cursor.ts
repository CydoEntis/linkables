import { z } from "zod";
import { ValidationError } from "../http/errors";

// savedAt keeps Postgres' microseconds: a millisecond Date would skip rows saved
// within the same millisecond as the last row of a page.
const cursorSchema = z.strictObject({
  // Postgres has no year 0, so the ::timestamptz cast would throw a 500.
  savedAt: z.iso.datetime({ precision: 6 }).refine((value) => !value.startsWith("0000-")),
  id: z.uuid(),
});

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

export function decodeCursor(token: string): Cursor {
  const parsed = cursorSchema.safeParse(parseJson(Buffer.from(token, "base64url").toString("utf8")));
  if (!parsed.success) throw new ValidationError("Invalid cursor", { fieldErrors: { cursor: "Invalid cursor" } });
  return parsed.data;
}
