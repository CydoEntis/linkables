import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnOffLinkButton } from "./TurnOffLinkButton";

afterEach(() => { vi.useRealTimers(); });

describe("TurnOffLinkButton", () => {
  it("asks for a second tap before turning the link off", () => {
    const onConfirm = vi.fn();
    render(<TurnOffLinkButton onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Turn off link" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/stops working right away/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tap again to turn off" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("ignores taps while the link is being turned off, keeping focus on the button", () => {
    const onConfirm = vi.fn();
    render(<TurnOffLinkButton onConfirm={onConfirm} pending />);
    const button = screen.getByRole("button", { name: "Turn off link" });
    button.focus();

    fireEvent.click(button);
    fireEvent.click(button);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveFocus();
  });

  it("goes back to its first tap after 3.5 seconds", () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(<TurnOffLinkButton onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Turn off link" }));

    act(() => { vi.advanceTimersByTime(3500); });

    fireEvent.click(screen.getByRole("button", { name: "Turn off link" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
