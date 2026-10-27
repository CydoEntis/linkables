import { expect, it } from "vitest";
import { signInMethod } from "./sign-in-method";
it("describes the local password sign-in", () => {
  expect(signInMethod()).toBe("Local account · email and password");
});
