import type { z } from "zod";
import type { readerArticleSchema, readerBlockSchema, readerInlineSchema, readerViewSchema } from "./schemas";

export type ReaderInline = z.infer<typeof readerInlineSchema>;
export type ReaderBlock = z.infer<typeof readerBlockSchema>;
export type ReaderArticle = z.infer<typeof readerArticleSchema>;
export type ReaderView = z.infer<typeof readerViewSchema>;
