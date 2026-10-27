import { groupOrderRequestSchema, groupRequestSchema, moveLinkRequestSchema } from "@linkables/shared/groups";
import { HTTP_STATUS } from "@linkables/shared/http";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import { parseWith } from "../http/validate";
import { createGroup, deleteGroup, listGroups, renameGroup, reorderGroups } from "./groups";
import { moveLink } from "./move-link";

const collectionParams = validator("param", parseWith(z.object({ id: z.uuid() }), "Invalid path"));
const groupParams = validator("param", parseWith(z.object({ id: z.uuid(), groupId: z.uuid() }), "Invalid path"));
const linkParams = validator("param", parseWith(z.object({ id: z.uuid(), linkId: z.uuid() }), "Invalid path"));
const nameBody = validator("json", parseWith(groupRequestSchema, "Invalid request body"));
const orderBody = validator("json", parseWith(groupOrderRequestSchema, "Invalid request body"));
const moveBody = validator("json", parseWith(moveLinkRequestSchema, "Invalid request body"));

export function groupRoutes({ db }: { db: Db }) {
  return new Hono<AuthEnv>()
    .get("/collections/:id/groups", collectionParams, async (c) => {
      return ok(c, await listGroups(db, { userId: c.get("userId"), collectionId: c.req.valid("param").id }));
    })
    .post("/collections/:id/groups", collectionParams, nameBody, async (c) => {
      const scope = { userId: c.get("userId"), collectionId: c.req.valid("param").id };
      return ok(c, await createGroup(db, scope, c.req.valid("json").name), HTTP_STATUS.CREATED);
    })
    .put("/collections/:id/groups/order", collectionParams, orderBody, async (c) => {
      const scope = { userId: c.get("userId"), collectionId: c.req.valid("param").id };
      return ok(c, await reorderGroups(db, scope, c.req.valid("json").ids));
    })
    .patch("/collections/:id/groups/:groupId", groupParams, nameBody, async (c) => {
      const { id, groupId } = c.req.valid("param");
      return ok(c, await renameGroup(db, { userId: c.get("userId"), collectionId: id, groupId }, c.req.valid("json").name));
    })
    .delete("/collections/:id/groups/:groupId", groupParams, async (c) => {
      const { id, groupId } = c.req.valid("param");
      await deleteGroup(db, { userId: c.get("userId"), collectionId: id, groupId });
      return ok(c, null);
    })
    .patch("/collections/:id/links/:linkId", linkParams, moveBody, async (c) => {
      const { id, linkId } = c.req.valid("param");
      await moveLink(db, { userId: c.get("userId"), collectionId: id, linkId, groupId: c.req.valid("json").groupId });
      return ok(c, null);
    });
}
