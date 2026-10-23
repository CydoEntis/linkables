import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInScreen } from "./SignInScreen";
import type { LinkProblem } from "./link-landing";

const signInWithOtp = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { auth: { signInWithOtp } } }));

function renderScreen(linkProblem: LinkProblem | null = null, focusHeading = false) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SignInScreen linkProblem={linkProblem} focusHeading={focusHeading} />
    </QueryClientProvider>,
  );
}

async function submitEmail(email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
  return user;
}

beforeEach(() => {
  signInWithOtp.mockReset();
});

describe("SignInScreen", () => {
  it("sends a magic link and shows check-your-email with the address", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    renderScreen();
    await submitEmail("owner@example.com");
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "owner@example.com",
      options: { emailRedirectTo: "http://localhost:5173/" },
    });
  });

  it("moves focus to the check-your-email heading after a link is sent", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    renderScreen();
    await submitEmail("owner@example.com");
    expect(await screen.findByRole("heading", { name: "Check your email" })).toHaveFocus();
  });

  it("moves focus to the sign-in heading on Use a different email", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    renderScreen();
    const user = await submitEmail("owner@example.com");
    await user.click(await screen.findByRole("button", { name: "Use a different email" }));
    expect(screen.getByRole("heading", { name: "Sign in to linkables" })).toHaveFocus();
  });

  it("focuses the sign-in heading when it replaces the signed-in screen", () => {
    renderScreen(null, true);
    expect(screen.getByRole("heading", { name: "Sign in to linkables" })).toHaveFocus();
  });

  it("leaves focus alone on a fresh page load", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: "Sign in to linkables" })).not.toHaveFocus();
  });

  it("goes back to the form with the address kept on Use a different email", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    renderScreen();
    const user = await submitEmail("owner@example.com");
    await user.click(await screen.findByRole("button", { name: "Use a different email" }));
    expect(screen.getByLabelText("Email")).toHaveValue("owner@example.com");
  });

  it("shows an invalid email message without asking Supabase", async () => {
    renderScreen();
    await submitEmail("not-an-email");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("asks the user to wait when Supabase rate-limits the email", async () => {
    signInWithOtp.mockResolvedValue({
      data: {},
      error: new AuthApiError("Email rate limit exceeded", 429, "over_email_send_rate_limit"),
    });
    renderScreen();
    await submitEmail("owner@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("Wait a bit and try again.");
  });

  it("says the user is offline when the request cannot reach Supabase", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError("Failed to fetch", 0) });
    renderScreen();
    await submitEmail("owner@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("You're offline.");
  });

  it("explains an expired link on landing", () => {
    renderScreen("expired");
    expect(screen.getByRole("alert")).toHaveTextContent("This link has expired. Send a new one.");
  });

  it("confirms a resend from the check-your-email screen", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    renderScreen();
    const user = await submitEmail("owner@example.com");
    await user.click(await screen.findByRole("button", { name: "Resend" }));
    expect(await screen.findByText("Sent another link.")).toBeInTheDocument();
    expect(signInWithOtp).toHaveBeenCalledTimes(2);
  });
});
