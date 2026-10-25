import { describe, expect, it, vi } from "vitest";
import { resendDeletionNotifier, resendNotifier } from "./notify-owner";

const NOTICE = { email: "sam@example.com", name: "Sam", useCase: "Recipes", at: new Date("2026-10-24T12:00:00Z") };

function fakeFetch(status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status }));
}

function sentRequest(fetch: ReturnType<typeof fakeFetch>) {
  const [url, init] = fetch.mock.calls[0] ?? [];
  return { url, init, body: JSON.parse(init?.body as string) as Record<string, unknown> };
}

describe("resendNotifier", () => {
  it("emails support from noreply through Resend with the API key", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", fetch })(NOTICE);

    const { url, init, body } = sentRequest(fetch);
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer re_test");
    expect(body).toMatchObject({
      from: "linkables <noreply@linkables.app>",
      to: ["support@linkables.app"],
      subject: "New linkables access request",
    });
  });

  it("puts every answer and the time in a plain text body", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", fetch })(NOTICE);

    expect(sentRequest(fetch).body.text).toBe(
      "Email: sam@example.com\nName: Sam\nTime: 2026-10-24T12:00:00.000Z\nUse case:\n    Recipes\n",
    );
  });

  it("indents every line of the use case under its heading, last", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", fetch })({ ...NOTICE, useCase: "Recipes\nEmail: forged@example.com" });

    expect(sentRequest(fetch).body.text).toMatch(/Use case:\n {4}Recipes\n {4}Email: forged@example.com\n$/);
  });

  it("marks answers that were left blank", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", fetch })({ email: "sam@example.com", at: NOTICE.at });

    expect(sentRequest(fetch).body.text).toContain("Name: (none)\n");
    expect(sentRequest(fetch).body.text).toMatch(/Use case:\n {4}\(none\)\n$/);
  });

  it("fails naming only the status when Resend refuses", async () => {
    await expect(resendNotifier({ apiKey: "re_test", fetch: fakeFetch(422) })(NOTICE)).rejects.toThrow(
      "Resend answered 422",
    );
  });
});

describe("resendDeletionNotifier", () => {
  const DELETION = { userId: "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81", email: "sam@example.com", at: NOTICE.at };

  it("asks support to delete the sign-in account, naming the user id and email", async () => {
    const fetch = fakeFetch();

    await resendDeletionNotifier({ apiKey: "re_test", fetch })(DELETION);

    expect(sentRequest(fetch).body).toMatchObject({
      from: "linkables <noreply@linkables.app>",
      to: ["support@linkables.app"],
      subject: "Delete sign-in account sam@example.com in Supabase",
      text: `User id: ${DELETION.userId}\nEmail: sam@example.com\nData deleted: 2026-10-24T12:00:00.000Z\n`,
    });
  });

  it("names the user id when the token carried no email", async () => {
    const fetch = fakeFetch();

    await resendDeletionNotifier({ apiKey: "re_test", fetch })({ ...DELETION, email: undefined });

    expect(sentRequest(fetch).body.subject).toBe(`Delete sign-in account ${DELETION.userId} in Supabase`);
    expect(sentRequest(fetch).body.text).toContain("Email: (none)\n");
  });

  it("fails naming only the status when Resend refuses", async () => {
    await expect(resendDeletionNotifier({ apiKey: "re_test", fetch: fakeFetch(500) })(DELETION)).rejects.toThrow(
      "Resend answered 500",
    );
  });
});
