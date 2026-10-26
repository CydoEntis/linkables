import { z } from "zod";

// What the content script and the pop-up ask the worker, and what it answers.
// explicit: the asking page is the connect page, so a paused auto-connect resumes.
export const workerRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("wants-session"), explicit: z.boolean() }),
  z.object({ type: z.literal("session"), nonce: z.string(), tokenHash: z.string().min(1), explicit: z.boolean() }),
  z.object({ type: z.literal("sign-in-with-google") }),
]);

export type WorkerRequest = z.infer<typeof workerRequestSchema>;

export const wantsSessionAnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hello"), nonce: z.string() }),
  z.object({ kind: z.literal("signed-in") }),
  z.object({ kind: z.literal("no") }),
]);

export type WantsSessionAnswer = z.infer<typeof wantsSessionAnswerSchema>;

// ignored: no hand-off was pending under that nonce, so nothing was tried.
export const sessionAnswerSchema = z.object({ result: z.enum(["signed-in", "failed", "ignored"]) });

export type SessionAnswer = z.infer<typeof sessionAnswerSchema>;

export const googleAnswerSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), problem: z.enum(["cancelled", "failed"]) }),
]);

export type GoogleAnswer = z.infer<typeof googleAnswerSchema>;
