import { describe, expect, it } from "vitest";
import { shareAccessFormSchema, splitEmails } from "./share-access-form";

describe("splitEmails", () => {
  it("splits on newlines, commas, semicolons and spaces", () => {
    expect(splitEmails("a@x.com, b@x.com;c@x.com\nd@x.com  e@x.com\n")).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"]);
  });

  it("keeps only the address from an angle-bracket form", () => {
    expect(splitEmails("<a@x.com>")).toEqual(["a@x.com"]);
  });
});

describe("shareAccessFormSchema", () => {
  it("lower-cases and de-duplicates the listed addresses", () => {
    const parsed = shareAccessFormSchema.parse({ mode: "emails", emails: "Sam@Example.com\nsam@example.com" });

    expect(parsed).toEqual({ mode: "emails", emails: ["sam@example.com"] });
  });

  it("asks for an email when only these emails is chosen with none listed", () => {
    const result = shareAccessFormSchema.safeParse({ mode: "emails", emails: "  " });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["emails"]);
  });

  it("accepts an empty list for anyone with the link", () => {
    expect(shareAccessFormSchema.safeParse({ mode: "link", emails: "" }).success).toBe(true);
  });

  it("points at a malformed address", () => {
    const result = shareAccessFormSchema.safeParse({ mode: "emails", emails: "sam@example.com\nnot-an-email" });

    expect(result.success).toBe(false);
  });
});
