import { describe, expect, it, vi } from "vitest";
import { resendViewerCodeSender } from "./send-viewer-code";

function fakeFetch(status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status }));
}

describe("resendViewerCodeSender", () => {
  it("sends the code to the viewer alone through Resend with the API key", async () => {
    const fetch = fakeFetch();

    await resendViewerCodeSender({ apiKey: "re_test", from: "links@selfhost.example", fetch })({ to: "sam@example.com", code: "042517" });

    const [url, init] = fetch.mock.calls[0] ?? [];
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer re_test");
    expect(body).toMatchObject({ from: "links@selfhost.example", to: ["sam@example.com"], subject: "Your linkables code: 042517" });
    expect(body.text).toContain("042517");
  });

  it("fails naming only the status, never the address", async () => {
    const send = resendViewerCodeSender({ apiKey: "re_test", from: "links@selfhost.example", fetch: fakeFetch(422) })({ to: "sam@example.com", code: "042517" });

    await expect(send).rejects.toThrow("Resend answered 422");
    await expect(send).rejects.not.toThrow(/sam@example\.com/);
  });
});
