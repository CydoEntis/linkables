import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ASK_BEFORE_OPENING_KEY, useAskBeforeOpening } from "../open-links/confirm-setting";
import { OpeningLinksSection } from "./OpeningLinksSection";

afterEach(() => {
  useAskBeforeOpening.setState({ ask: true });
  localStorage.clear();
});

describe("OpeningLinksSection", () => {
  it("starts with asking on", () => {
    render(<OpeningLinksSection />);
    expect(screen.getByRole("switch", { name: "Ask before opening several links" })).toBeChecked();
  });

  it("turns asking off and back on, remembered on this device", async () => {
    render(<OpeningLinksSection />);
    const toggle = screen.getByRole("switch", { name: "Ask before opening several links" });
    await userEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem(ASK_BEFORE_OPENING_KEY)).toBe("off");
    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(localStorage.getItem(ASK_BEFORE_OPENING_KEY)).toBeNull();
  });
});
