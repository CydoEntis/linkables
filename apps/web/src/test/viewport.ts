import { vi } from "vitest";

const plainMatchMedia = window.matchMedia.bind(window);

// Answers the app's (min-width: …rem) queries as a window this many CSS pixels wide.
export function stubViewport(width: number): void {
  vi.stubGlobal("matchMedia", (query: string) => {
    const rem = /min-width:\s*([\d.]+)rem/.exec(query)?.[1];
    return {
      matches: rem !== undefined && width >= Number(rem) * 16,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });
}

// Back to setup.ts's plain tab, where no media query matches.
export function resetViewport(): void {
  vi.stubGlobal("matchMedia", plainMatchMedia);
}
