import { expect, it } from "vitest";
import { isSignInReturn } from "./sign-in-return";

it("recognises a Google or email sign-in coming back with tokens in the hash", () => {
  expect(isSignInReturn("https://app.test/sign-in#access_token=a&refresh_token=b")).toBe(true);
});

it("recognises a cancelled Google sign-in coming back with an error in the query", () => {
  expect(isSignInReturn("https://app.test/sign-in?error=access_denied&error_description=Cancelled")).toBe(true);
});

it("recognises an expired email link coming back with an error in the hash", () => {
  expect(isSignInReturn("https://app.test/#error=access_denied&error_code=otp_expired")).toBe(true);
});

it("ignores an ordinary page load", () => {
  expect(isSignInReturn("https://app.test/save?url=https%3A%2F%2Fexample.test#top")).toBe(false);
});
