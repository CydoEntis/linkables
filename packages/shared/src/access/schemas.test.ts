import { describe, expect, it } from "vitest";
import { accessRequestSchema } from "./schemas";

const parse = (fields: Record<string, string>) => accessRequestSchema.parse({ email: "sam@example.com", ...fields });

describe("accessRequestSchema", () => {
  it("keeps a name on one line", () => {
    expect(parse({ name: "Sam\nUse case: forged\r\nTime: now" }).name).toBe("Sam Use case: forged Time: now");
  });

  it("keeps the line breaks and tabs in a use case and drops other control characters", () => {
    expect(parse({ useCase: "Recipes\r\n\tand\u0007 notes\u0000" }).useCase).toBe("Recipes\n\tand notes");
  });

  it("treats an answer of only whitespace as no answer", () => {
    expect(parse({ name: " \n ", useCase: "\t" })).toMatchObject({ name: undefined, useCase: undefined });
  });
});
