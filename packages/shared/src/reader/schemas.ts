import { z } from "zod";
import { URL_MAX_LENGTH } from "../links/constants";
import { HEADING_LEVELS, READER_BLOCKS_MAX } from "./constants";

export function isHttpUrl(value: string): boolean {
  const url = URL.parse(value);
  return url !== null && (url.protocol === "http:" || url.protocol === "https:");
}

// Page content is untrusted: only http(s) links and images ever reach a client.
const httpUrlSchema = z.string().max(URL_MAX_LENGTH).refine(isHttpUrl, { error: "must be an http(s) URL" });

// A run of text with its marks; a paragraph is a list of runs, never HTML.
export const readerInlineSchema = z.strictObject({
  text: z.string().min(1),
  href: httpUrlSchema.optional(),
  bold: z.literal(true).optional(),
  italic: z.literal(true).optional(),
  code: z.literal(true).optional(),
});

const runsSchema = z.array(readerInlineSchema).min(1);

export const readerBlockSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("heading"), level: z.literal(HEADING_LEVELS), content: runsSchema }),
  z.strictObject({ type: z.literal("paragraph"), content: runsSchema }),
  z.strictObject({ type: z.literal("list"), ordered: z.boolean(), items: z.array(runsSchema).min(1) }),
  z.strictObject({ type: z.literal("quote"), paragraphs: z.array(runsSchema).min(1) }),
  z.strictObject({ type: z.literal("code"), text: z.string().min(1) }),
  z.strictObject({
    type: z.literal("image"),
    src: httpUrlSchema,
    alt: z.string().nullable(),
    caption: z.string().nullable(),
  }),
]);

export const readerArticleSchema = z.strictObject({
  title: z.string().nullable(),
  byline: z.string().nullable(),
  siteName: z.string().nullable(),
  minutes: z.number().int().positive(),
  truncated: z.boolean(),
  blocks: z.array(readerBlockSchema).min(1).max(READER_BLOCKS_MAX),
});

// url is the caller's own saved URL, for the Open button.
export const readerViewSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("ok"), url: z.string(), article: readerArticleSchema }),
  z.strictObject({ status: z.literal("unavailable"), url: z.string() }),
]);
