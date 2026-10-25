import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { resetViewport, stubViewport } from "../test/viewport";
import { LayoutToggle } from "./LayoutToggle";
import { LIST_LAYOUT_KEY, useLayoutChoice } from "./list-layout";

afterEach(() => {
  resetViewport();
  useLayoutChoice.setState({ choice: null });
  localStorage.clear();
});

describe("LayoutToggle", () => {
  it("starts on the grid at 1800 px and wider", () => {
    stubViewport(2560);
    render(<LayoutToggle />);
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
  });

  it("starts on the list below 1800 px, and switches to the grid on this device", async () => {
    stubViewport(1440);
    render(<LayoutToggle />);
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(LIST_LAYOUT_KEY)).toBe("grid");
  });
});
