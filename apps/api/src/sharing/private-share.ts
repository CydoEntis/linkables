import { SHARE_CODE_EXPIRY_MINUTES, type ShareAccess, type ViewerSession } from "@linkables/shared/sharing";
import { and, asc, eq, gt, lt, notInArray, sql } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { collection, shareAllowedEmail, shareCode, shareViewerSession } from "../db/schema";
import { lockCollection } from "../groups/groups";
import { NotFoundError, UnauthenticatedError, UpstreamError } from "../http/errors";
import type { Logger } from "../log/logger";
import type { SendViewerCode } from "./send-viewer-code";
import { codeMatches, hashCode, hashSessionToken, newCode, newSessionToken } from "./viewer-code";

type Owned = { userId: string; id: string };

const MINUTE_MS = 60 * 1000;
export const CODE_TTL_MS = SHARE_CODE_EXPIRY_MINUTES * MINUTE_MS;
export const SESSION_TTL_MS = 12 * 60 * MINUTE_MS;
export const CODE_ATTEMPTS_MAX = 5;

// One message for every way a code can fail, so the answer never says which part was wrong.
const BAD_CODE = "That code didn't work. Ask for a new one.";

export async function getShareAccess(db: Db | Tx, { userId, id }: Owned): Promise<ShareAccess> {
  const [row] = await db
    .select({ sharePrivate: collection.sharePrivate })
    .from(collection)
    .where(and(eq(collection.id, id), eq(collection.userId, userId)));
  if (row === undefined) throw new NotFoundError("Collection not found");
  const emails = await db
    .select({ email: shareAllowedEmail.email })
    .from(shareAllowedEmail)
    .where(eq(shareAllowedEmail.collectionId, id))
    .orderBy(asc(shareAllowedEmail.email));
  return { mode: row.sharePrivate ? "emails" : "link", emails: emails.map((item) => item.email) };
}

// Whoever was let in on the old terms loses the way in at once: sessions and codes of an address
// that is no longer listed go with it, and all of them go when the share opens to anyone.
async function dropRevoked(tx: Tx, collectionId: string, access: ShareAccess): Promise<void> {
  const keep = access.mode === "emails" ? access.emails : [];
  const sessions = eq(shareViewerSession.collectionId, collectionId);
  const codes = eq(shareCode.collectionId, collectionId);
  if (keep.length === 0) {
    await tx.delete(shareViewerSession).where(sessions);
    await tx.delete(shareCode).where(codes);
    return;
  }
  await tx.delete(shareViewerSession).where(and(sessions, notInArray(shareViewerSession.email, keep)));
  await tx.delete(shareCode).where(and(codes, notInArray(shareCode.email, keep)));
}

// Replaces the whole list. Without a way to send mail a private share could never be opened, so it is refused.
export function setShareAccess(db: Db, canSendMail: boolean, owned: Owned, access: ShareAccess): Promise<ShareAccess> {
  if (access.mode === "emails" && !canSendMail) throw new UpstreamError("Private shares are not available right now");
  return db.transaction(async (tx) => {
    await lockCollection(tx, { userId: owned.userId, collectionId: owned.id });
    await tx.update(collection).set({ sharePrivate: access.mode === "emails" }).where(eq(collection.id, owned.id));
    await tx.delete(shareAllowedEmail).where(eq(shareAllowedEmail.collectionId, owned.id));
    if (access.emails.length > 0) {
      await tx.insert(shareAllowedEmail).values(access.emails.map((email) => ({ collectionId: owned.id, email })));
    }
    await dropRevoked(tx, owned.id, access);
    return getShareAccess(tx, owned);
  });
}

// Nothing is kept past its use: expired codes and sessions are swept on each request that touches them.
async function purgeExpired(db: Db, at: Date): Promise<void> {
  await db.delete(shareCode).where(lt(shareCode.expiresAt, at));
  await db.delete(shareViewerSession).where(lt(shareViewerSession.expiresAt, at));
}

async function privateCollectionId(db: Db, token: string): Promise<string | undefined> {
  const [row] = await db
    .select({ id: collection.id })
    .from(collection)
    .where(and(eq(collection.shareToken, token), eq(collection.sharePrivate, true)));
  return row?.id;
}

async function isListed(db: Db, collectionId: string, email: string): Promise<boolean> {
  const [row] = await db
    .select({ email: shareAllowedEmail.email })
    .from(shareAllowedEmail)
    .where(and(eq(shareAllowedEmail.collectionId, collectionId), eq(shareAllowedEmail.email, email)));
  return row !== undefined;
}

export type ViewerDeps = { db: Db; logger: Logger; now: () => number; send: SendViewerCode };

// Always resolves the same way. An address that is not listed, a link that is unknown, off or open to
// anyone all do the same work (a code is made and hashed) and send nothing, so neither the answer nor the
// time says whether the address is on the list. The mail goes out after the answer.
export async function requestViewerCode({ db, logger, now, send }: ViewerDeps, token: string, email: string): Promise<void> {
  const at = new Date(now());
  await purgeExpired(db, at);
  const id = await privateCollectionId(db, token);
  const listed = id !== undefined && (await isListed(db, id, email));
  const code = newCode();
  const hashed = await hashCode(code);
  if (!listed) return;
  const row = { collectionId: id, email, salt: hashed.salt, codeHash: hashed.hash, attempts: 0, expiresAt: new Date(at.getTime() + CODE_TTL_MS), createdAt: at };
  await db
    .insert(shareCode)
    .values(row)
    .onConflictDoUpdate({ target: [shareCode.collectionId, shareCode.email], set: row });
  // Not awaited: the viewer's answer never waits on, or fails with, the mail. Only the status is logged.
  send({ to: email, code }).catch((error: unknown) => {
    logger.warn("viewer code email failed", { error });
  });
}

// Counts the try before checking it, so parallel guesses cannot beat the cap, and the row is
// deleted by id on success, so two right answers at once cannot both pass.
async function spendAttempt(db: Db, collectionId: string, email: string, at: Date) {
  const [row] = await db
    .update(shareCode)
    .set({ attempts: sql`${shareCode.attempts} + 1` })
    .where(
      and(
        eq(shareCode.collectionId, collectionId),
        eq(shareCode.email, email),
        gt(shareCode.expiresAt, at),
        lt(shareCode.attempts, CODE_ATTEMPTS_MAX),
      ),
    )
    .returning();
  return row;
}

async function consume(db: Db, id: string): Promise<boolean> {
  const rows = await db.delete(shareCode).where(eq(shareCode.id, id)).returning({ id: shareCode.id });
  return rows.length === 1;
}

async function startSession(db: Db, collectionId: string, email: string, at: Date): Promise<ViewerSession> {
  const session = newSessionToken();
  const expiresAt = new Date(at.getTime() + SESSION_TTL_MS);
  await db.insert(shareViewerSession).values({ tokenHash: hashSessionToken(session), collectionId, email, expiresAt, createdAt: at });
  return { session, expiresAt: expiresAt.toISOString() };
}

// Every failure is the same UNAUTHENTICATED. When there is no code to check, one is hashed anyway,
// so a wrong guess costs the same whether or not the address is listed.
export async function verifyViewerCode({ db, now }: ViewerDeps, token: string, email: string, code: string): Promise<ViewerSession> {
  const at = new Date(now());
  await purgeExpired(db, at);
  const id = await privateCollectionId(db, token);
  const row = id === undefined ? undefined : await spendAttempt(db, id, email, at);
  if (id === undefined || row === undefined) {
    await hashCode(code);
    throw new UnauthenticatedError(BAD_CODE);
  }
  if (!(await codeMatches(code, { salt: row.salt, hash: row.codeHash })) || !(await consume(db, row.id))) {
    throw new UnauthenticatedError(BAD_CODE);
  }
  return startSession(db, id, email, at);
}

export async function hasViewerSession(db: Db, collectionId: string, session: string, now: number): Promise<boolean> {
  const [row] = await db
    .select({ email: shareViewerSession.email })
    .from(shareViewerSession)
    .where(
      and(
        eq(shareViewerSession.tokenHash, hashSessionToken(session)),
        eq(shareViewerSession.collectionId, collectionId),
        gt(shareViewerSession.expiresAt, new Date(now)),
      ),
    );
  return row !== undefined;
}
