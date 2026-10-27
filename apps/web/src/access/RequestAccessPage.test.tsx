import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, NETWORK_ERROR } from "@linkables/shared/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestAccessPage } from "./RequestAccessPage";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RequestAccessPage />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function submit(user: ReturnType<typeof userEvent.setup>, email = "sam@example.com") {
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Request access" }));
}

function sentBody() {
  const init = request.mock.calls[0]?.[2];
  return JSON.parse(init?.body as string) as Record<string, unknown>;
}

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue(null);
});

describe("request access", () => {
  it("labels every field a person fills in", () => {
    renderPage();

    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Name (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("What would you use it for? (optional)")).toBeInTheDocument();
  });

  it("thanks the person once the request is in", async () => {
    const user = renderPage();

    await submit(user);

    expect(await screen.findByRole("heading", { name: "Thanks! We'll email you when there's a spot." })).toHaveFocus();
  });

  it("sends the answers to the API", async () => {
    const user = renderPage();
    await user.type(screen.getByLabelText("Name (optional)"), "Sam");
    await user.type(screen.getByLabelText("What would you use it for? (optional)"), "Recipes");

    await submit(user);

    expect(request).toHaveBeenCalledWith("/access-requests", expect.anything(), expect.objectContaining({ method: "POST" }));
    expect(sentBody()).toEqual({ email: "sam@example.com", name: "Sam", useCase: "Recipes", hp_confirm_field: "" });
  });

  it("asks for a valid email without sending anything", async () => {
    const user = renderPage();

    await submit(user, "sam at example");

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(request).not.toHaveBeenCalled();
  });

  it("says when the use case is too long", async () => {
    const user = renderPage();
    await user.click(screen.getByLabelText("What would you use it for? (optional)"));
    await user.paste("x".repeat(501));

    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Keep this to 500 characters or fewer");
  });

  it("hides the honeypot from people and screen readers", () => {
    renderPage();

    const trap = document.querySelector("input[name=hp_confirm_field]");

    expect(trap?.closest("[aria-hidden=true]")).not.toBeNull();
    expect(trap).toHaveAttribute("tabindex", "-1");
  });

  it.each([
    ["VALIDATION", "Enter a valid email address"],
    ["RATE_LIMIT", "Requests are paused for a bit. Try again later."],
    [NETWORK_ERROR, "You're offline. Check your connection and try again."],
    ["INTERNAL", "Something went wrong on our side. Try again in a moment."],
  ])("explains a %s failure and keeps the form", async (code, message) => {
    request.mockRejectedValue(new ApiError(code, "failed"));
    const user = renderPage();

    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Email")).toHaveValue("sam@example.com");
  });
});
