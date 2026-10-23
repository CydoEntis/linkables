import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { highlightParts, MatchedText } from "./MatchedText";

describe("highlightParts", () => {
  it("marks a match whatever its case", () => {
    expect(highlightParts("Rust by Example", "rUST")).toEqual([
      { text: "Rust", match: true },
      { text: " by Example", match: false },
    ]);
  });

  it("marks every word of the search", () => {
    expect(highlightParts("Tokyo night walk", "walk tokyo").filter((part) => part.match).map((part) => part.text)).toEqual([
      "Tokyo",
      "walk",
    ]);
  });

  it("treats regex characters as plain text", () => {
    expect(highlightParts("C++ (2026) [draft]", "c++ (2026)")).toEqual([
      { text: "C++", match: true },
      { text: " ", match: false },
      { text: "(2026)", match: true },
      { text: " [draft]", match: false },
    ]);
  });

  it("skips search syntax that is not a word to find", () => {
    expect(highlightParts("rust or go", '"rust" or -go')).toEqual([
      { text: "rust", match: true },
      { text: " or go", match: false },
    ]);
  });

  it("leaves text alone without a search", () => {
    expect(highlightParts("Rust", undefined)).toEqual([{ text: "Rust", match: false }]);
  });
});

describe("MatchedText", () => {
  it("wraps matches in mark and never renders the text as markup", () => {
    const { container } = render(<MatchedText text={'<img src=x onerror="alert(1)"> Rust'} query="rust" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("mark")).toHaveTextContent("Rust");
    expect(container).toHaveTextContent('<img src=x onerror="alert(1)"> Rust');
  });
});
