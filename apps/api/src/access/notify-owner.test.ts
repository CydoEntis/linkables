import { describe, expect, it, vi } from "vitest";
import { resendNotifier } from "./notify-owner";

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
      "Email: sam@example.com\nName: Sam\nUse case: Recipes\nTime: 2026-10-24T12:00:00.000Z\n",
    );
  });

  it("marks answers that were left blank", async () => {
    const fetch = fakeFetch();

    await resendNotifier({ apiKey: "re_test", fetch })({ email: "sam@example.com", at: NOTICE.at });

    expect(sentRequest(fetch).body.text).toContain("Name: (none)\nUse case: (none)\n");
  });

  it("fails naming only the status when Resend refuses", async () => {
    await expect(resendNotifier({ apiKey: "re_test", fetch: fakeFetch(422) })(NOTICE)).rejects.toThrow(
      "Resend answered 422",
    );
  });
});
