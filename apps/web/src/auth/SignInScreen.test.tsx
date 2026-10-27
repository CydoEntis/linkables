import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInScreen } from "./SignInScreen";
import type { LinkProblem } from "./link-landing";

const signInWithOtp = vi.hoisted(() => vi.fn());
const signInWithOAuth = vi.hoisted(() => vi.fn());
const verifyOtp = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { auth: { signInWithOtp, signInWithOAuth, verifyOtp } } }));

function renderScreen(linkProblem: LinkProblem | null = null, focusHeading = false) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SignInScreen linkProblem={linkProblem} focusHeading={focusHeading} />
    </QueryClientProvider>,
  );
}

async function submitEmail(email: string, user = userEvent.setup()) {
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
  return user;
}

async function reachCodeStep(user = userEvent.setup()) {
  signInWithOtp.mockResolvedValue({ data: {}, error: null });
  renderScreen();
  await submitEmail("owner@example.com", user);
  await screen.findByRole("heading", { name: "Check your email" });
  return user;
}

beforeEach(() => {
  signInWithOtp.mockReset();
  signInWithOAuth.mockReset();
  verifyOtp.mockReset();
  window.history.replaceState(null, "", "/sign-in");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sign-in start", () => {
  it("offers Continue with Google above the email field", () => {
    renderScreen();
    const google = screen.getByRole("button", { name: "Continue with Google" });
    const email = screen.getByLabelText("Email");
    expect(google.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("links back to home and to the Terms, Privacy and Help pages", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: "← Back to home" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Terms" }).map((link) => link.getAttribute("href"))).toEqual(["/terms", "/terms"]);
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/support");
  });

  it("sends people without an invite to the request access form", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: "request access" })).toHaveAttribute("href", "/request-access");
  });

  it("starts Google sign-in with a redirect back to this page", async () => {
    signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    renderScreen();
    await userEvent.setup().click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/sign-in` },
    });
  });

  it("shows an offline banner and disables the buttons while offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderScreen();
    expect(screen.getByText("You're offline. Check your connection and try again.")).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Email me a sign-in link" })).toBeDisabled();
  });

  it("drops the offline banner when the connection comes back", () => {
    const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderScreen();
    onLine.mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  it("explains a cancelled or failed Google sign-in on landing", () => {
    renderScreen("google-failed");
    expect(screen.getByRole("alert")).toHaveTextContent("Google sign-in didn't finish. Try again.");
  });

  it("clears the landing message while Google sign-in starts again", async () => {
    signInWithOAuth.mockReturnValue(new Promise(() => undefined));
    renderScreen("google-failed");
    await userEvent.setup().click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sends a sign-in email and shows check-your-email with the address", async () => {
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

  it("focuses the sign-in heading when it replaces the signed-in screen", () => {
    renderScreen(null, true);
    expect(screen.getByRole("heading", { name: "Sign in to linkables" })).toHaveFocus();
  });

  it("leaves focus alone on a fresh page load", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: "Sign in to linkables" })).not.toHaveFocus();
  });

  it("shows an invalid email message without asking Supabase", async () => {
    renderScreen();
    await submitEmail("not-an-email");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an email address, like you@example.com");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("moves focus back to the email field when the address is invalid", async () => {
    renderScreen();
    await submitEmail("not-an-email");
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("sends the address without surrounding spaces", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    renderScreen();
    await submitEmail("  owner@example.com ");
    await screen.findByRole("heading", { name: "Check your email" });
    expect(signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "owner@example.com" }));
  });

  it("asks the user to wait when Supabase rate-limits the email", async () => {
    signInWithOtp.mockResolvedValue({
      data: {},
      error: new AuthApiError("Email rate limit exceeded", 429, "over_email_send_rate_limit"),
    });
    renderScreen();
    await submitEmail("owner@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Wait a minute, then try again.");
  });

  it("says the user is offline when the request cannot reach Supabase", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError("Failed to fetch", 0) });
    renderScreen();
    await submitEmail("owner@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("You're offline.");
  });

  it("explains a sign-in link that didn't work on landing", () => {
    renderScreen("invalid");
    expect(screen.getByRole("alert")).toHaveTextContent("This sign-in link didn't work. Send a new one.");
  });
});

describe("expired link", () => {
  it("says the link has expired on landing", () => {
    renderScreen("expired");
    expect(screen.getByRole("heading", { name: "This link has expired" })).toBeInTheDocument();
  });

  it("goes to the email field on Send a new link", async () => {
    renderScreen("expired");
    await userEvent.setup().click(screen.getByRole("button", { name: "Send a new link" }));
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });
});

describe("check your email", () => {
  it("moves focus to the check-your-email heading after the email is sent", async () => {
    await reachCodeStep();
    expect(screen.getByRole("heading", { name: "Check your email" })).toHaveFocus();
  });

  it("asks for the code as a one-time code on the numeric keypad", async () => {
    await reachCodeStep();
    const code = screen.getByLabelText("6-digit code");
    expect(code).toHaveAttribute("inputmode", "numeric");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("signs in with the code as soon as the sixth digit is typed", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    const user = await reachCodeStep();
    await user.type(screen.getByLabelText("6-digit code"), "12345");
    expect(verifyOtp).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("6-digit code"), "6");
    expect(verifyOtp).toHaveBeenCalledWith({ email: "owner@example.com", token: "123456", type: "email" });
  });

  it("signs in with a pasted code that has a space in it", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    const user = await reachCodeStep();
    await user.click(screen.getByLabelText("6-digit code"));
    await user.paste("123 456");
    expect(screen.getByLabelText("6-digit code")).toHaveValue("123456");
    expect(verifyOtp).toHaveBeenCalledWith({ email: "owner@example.com", token: "123456", type: "email" });
  });

  it("says a wrong code didn't work", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: new AuthApiError("Token has expired or is invalid", 403, "otp_expired") });
    const user = await reachCodeStep();
    await user.type(screen.getByLabelText("6-digit code"), "000000");
    expect(await screen.findByRole("alert")).toHaveTextContent("That code didn't work. Check it, or send a new one.");
    expect(screen.getByLabelText("6-digit code")).toHaveAttribute("aria-invalid", "true");
  });

  it("checks the code only once when Enter is pressed while checking", async () => {
    verifyOtp.mockReturnValue(new Promise(() => undefined));
    const user = await reachCodeStep();
    await user.type(screen.getByLabelText("6-digit code"), "111111");
    await user.type(screen.getByLabelText("6-digit code"), "{Enter}");
    expect(verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("checks a new code pasted after a wrong one", async () => {
    verifyOtp
      .mockResolvedValueOnce({ data: {}, error: new AuthApiError("Token has expired or is invalid", 403, "otp_expired") })
      .mockResolvedValueOnce({ data: {}, error: null });
    const user = await reachCodeStep();
    await user.type(screen.getByLabelText("6-digit code"), "111111");
    await screen.findByRole("alert");
    await user.paste("222222");
    expect(verifyOtp).toHaveBeenCalledTimes(2);
    expect(verifyOtp).toHaveBeenLastCalledWith({ email: "owner@example.com", token: "222222", type: "email" });
  });

  it("does not send a wrong code again when a digit is typed after it", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: new AuthApiError("Token has expired or is invalid", 403, "otp_expired") });
    const user = await reachCodeStep();
    const code = screen.getByLabelText("6-digit code");
    await user.type(code, "111111");
    await screen.findByRole("alert");
    await user.type(code, "1", { initialSelectionStart: 6, initialSelectionEnd: 6 });
    expect(verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("asks for all six digits when a short code is submitted", async () => {
    const user = await reachCodeStep();
    await user.type(screen.getByLabelText("6-digit code"), "123{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the 6-digit code from the email.");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("holds Resend for 60 seconds, then sends another email", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = await reachCodeStep(userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }));
    expect(screen.getByRole("button", { name: "Resend in 60s" })).toBeDisabled();
    act(() => { vi.advanceTimersByTime(60_000); });
    await user.click(screen.getByRole("button", { name: "Resend" }));
    expect(await screen.findByText("Sent another email.")).toBeInTheDocument();
    expect(signInWithOtp).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Resend in 60s" })).toBeDisabled();
  });

  it("goes back to the form with the address kept on Use a different email", async () => {
    const user = await reachCodeStep();
    await user.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByLabelText("Email")).toHaveValue("owner@example.com");
    expect(screen.getByRole("heading", { name: "Sign in to linkables" })).toHaveFocus();
  });

  it("tells the user where to look and how long the email works", async () => {
    await reachCodeStep();
    expect(screen.getByText("Can't find it? Check spam. The link and code work for an hour.")).toBeInTheDocument();
  });

  it("disables Resend while offline", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get");
    await reachCodeStep();
    onLine.mockReturnValue(false);
    fireEvent(window, new Event("offline"));
    expect(screen.getByRole("button", { name: /^Resend/ })).toBeDisabled();
  });
});
