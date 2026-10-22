import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { signOut, supabase } from "./auth/supabase";
import { queryClient } from "./query-client";
import { storeSession, stubAuthServer } from "./test/session";

beforeEach(stubAuthServer);
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("clears cached queries when the user signs out", async () => {
  storeSession("token-1");
  await supabase.auth.getSession();
  queryClient.setQueryData(["me"], { id: "user-1" });
  await signOut();
  await vi.waitFor(() => {
    expect(queryClient.getQueryData(["me"])).toBeUndefined();
  });
});
