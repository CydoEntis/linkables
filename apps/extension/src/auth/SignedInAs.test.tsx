import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SignedInAs } from "./SignedInAs";

const getSession = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { auth: { getSession } } }));

beforeEach(() => { getSession.mockReset(); });

it("names the account the extension is signed in to", async () => {
  getSession.mockResolvedValue({ data: { session: { user: { email: "sam@example.com" } } } });

  render(<SignedInAs />);

  expect(await screen.findByText("Signed in as sam@example.com")).toBeInTheDocument();
});

it("shows nothing for an account with no email", async () => {
  getSession.mockResolvedValue({ data: { session: { user: {} } } });

  const { container } = render(<SignedInAs />);

  await vi.waitFor(() => { expect(getSession).toHaveBeenCalled(); });
  expect(container).toBeEmptyDOMElement();
});
