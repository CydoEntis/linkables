import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rememberSession, signOut } from "./auth/session";
import { queryClient } from "./query-client";
import { session, storeSession, stubAuthServer } from "./test/session";

beforeEach(stubAuthServer);
afterEach(() => {
  rememberSession(null);
  queryClient.clear();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("keeps public queries when the initial cookie session becomes available", () => {
  rememberSession(null);
  queryClient.setQueryData(["shared", "public"], { name: "Research" });
  rememberSession(session());
  expect(queryClient.getQueryData(["shared", "public"])).toEqual({ name: "Research" });
});

it("clears cached private data when another account signs in", () => {
  rememberSession(session());
  queryClient.setQueryData(["private", "links"], ["private link"]);
  rememberSession({ ...session(), user: { ...session().user, id: "7d9c1b2a-3e4f-4a5b-8c6d-7e8f9a0b1c22" } });
  expect(queryClient.getQueryData(["private", "links"])).toBeUndefined();
});

it("clears cached queries when the user signs out", async () => {
  storeSession("token-1");

  queryClient.setQueryData(["me"], { id: "user-1" });
  await signOut();
  await vi.waitFor(() => {
    expect(queryClient.getQueryData(["me"])).toBeUndefined();
  });
});

