import { expect, it } from "vitest";
import { primaryCta } from "./access";

it("asks for access by email while linkables is invite-only", () => {
  expect(primaryCta(true)).toEqual({
    label: "Request access",
    longLabel: "Request access",
    href: "mailto:support@linkables.app?subject=linkables%20beta%20access",
  });
});

it("sends people to sign up once sign-up is open", () => {
  expect(primaryCta(false)).toMatchObject({ label: "Get started", href: "/sign-in" });
});
