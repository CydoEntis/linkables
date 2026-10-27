import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SignInScreen } from "./SignInScreen";

const login = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock("./session", () => ({ signIn: login }));

it("submits the local account email and password", async () => {
  render(<QueryClientProvider client={new QueryClient()}><SignInScreen /></QueryClientProvider>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.type(screen.getByLabelText("Password"), "password1234");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(login).toHaveBeenCalledWith({ email: "user@example.com", password: "password1234" }, expect.anything());
});
