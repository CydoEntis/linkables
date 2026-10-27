import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ShortcutGuide } from "./ShortcutGuide";

it("uses a custom self-hosted origin in the manual iOS shortcut destination", () => {
  render(<ShortcutGuide origin="https://research.private-tailnet.ts.net" />);
  expect(screen.getByText("https://research.private-tailnet.ts.net/save?url=")).toBeVisible();
  expect(screen.getByRole("list")).toHaveTextContent("URL Encoded Text");
  expect(screen.queryByText(/linkables\.app/)).toBeNull();
});
