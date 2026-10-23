import type { Locator } from "@playwright/test";

// WCAG contrast between an element's computed outline colour and its popup's background.
export async function outlineContrast(element: Locator, background: Locator): Promise<{ width: string; ratio: number }> {
  const backgroundColor = await background.evaluate((node) => getComputedStyle(node).backgroundColor);
  return element.evaluate((node, bg) => {
    const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!canvas) throw new Error("no 2d canvas");
    const luminance = (color: string) => {
      canvas.clearRect(0, 0, 1, 1);
      canvas.fillStyle = color;
      canvas.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0] = [...canvas.getImageData(0, 0, 1, 1).data].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const style = getComputedStyle(node);
    const [high, low] = [luminance(style.outlineColor), luminance(bg)].sort((a, b) => b - a);
    return { width: style.outlineWidth, ratio: ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05) };
  }, backgroundColor);
}
