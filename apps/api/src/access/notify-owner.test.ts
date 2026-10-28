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
  it("emails the configured owner from the configured sender through Resend", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch })(NOTICE);

    const { url, init, body } = sentRequest(fetch);
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer re_test");
    expect(body).toMatchObject({
      from: "links@selfhost.example",
      to: ["admin@selfhost.example"],
      subject: "New linkables access request",
    });
  });

  it("puts every answer and the time in a plain text body", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch })(NOTICE);

    expect(sentRequest(fetch).body.text).toBe(
      "Email: sam@example.com\nName: Sam\nTime: 2026-10-24T12:00:00.000Z\nUse case:\n    Recipes\n",
    );
  });

  it("indents every line of the use case under its heading, last", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch })({ ...NOTICE, useCase: "Recipes\nEmail: forged@example.com" });

    expect(sentRequest(fetch).body.text).toMatch(/Use case:\n {4}Recipes\n {4}Email: forged@example.com\n$/);
  });

  it("marks answers that were left blank", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch })({ email: "sam@example.com", at: NOTICE.at });

    expect(sentRequest(fetch).body.text).toContain("Name: (none)\n");
    expect(sentRequest(fetch).body.text).toMatch(/Use case:\n {4}\(none\)\n$/);
  });

  it("fails naming only the status when Resend refuses", async () => {
    await expect(resendNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch: fakeFetch(422) })(NOTICE)).rejects.toThrow(
      "Resend answered 422",
    );
  });
});

describe("resendDeletionNotifier", () => {
  const DELETION = { userId: "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81", email: "sam@example.com", at: NOTICE.at };

  it("notifies the configured owner after a local account is deleted", async () => {
    const fetch = fakeFetch();

    await resendDeletionNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch })(DELETION);

    expect(sentRequest(fetch).body).toMatchObject({
      from: "links@selfhost.example",
      to: ["admin@selfhost.example"],
      subject: "Linkables account deleted",
      text: `User id: ${DELETION.userId}\nEmail: sam@example.com\nData deleted: 2026-10-24T12:00:00.000Z\n`,
    });
  });

  it("keeps the user id in the body when no email is available", async () => {
    const fetch = fakeFetch();

    await resendDeletionNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch })({ ...DELETION, email: undefined });

    expect(sentRequest(fetch).body.subject).toBe("Linkables account deleted");
    expect(sentRequest(fetch).body.text).toContain("Email: (none)\n");
  });

  it("fails naming only the status when Resend refuses", async () => {
    await expect(resendDeletionNotifier({ apiKey: "re_test", from: "links@selfhost.example", ownerEmail: "admin@selfhost.example", fetch: fakeFetch(500) })(DELETION)).rejects.toThrow(
      "Resend answered 500",
    );
  });
});
