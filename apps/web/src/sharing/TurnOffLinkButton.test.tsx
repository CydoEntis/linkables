import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DISARM_AFTER_MS, TurnOffLinkButton } from "./TurnOffLinkButton";

afterEach(() => { vi.useRealTimers(); });

describe("TurnOffLinkButton", () => {
  it("asks for a second tap before turning the link off", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<TurnOffLinkButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Turn off link" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Tap again to turn off" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("goes back to asking once when the second tap doesn't come", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onConfirm = vi.fn();
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    render(<TurnOffLinkButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Turn off link" }));
    act(() => { vi.advanceTimersByTime(DISARM_AFTER_MS); });
    await user.click(screen.getByRole("button", { name: "Turn off link" }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
