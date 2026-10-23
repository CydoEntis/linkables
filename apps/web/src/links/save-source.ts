import type { LINK_SOURCES } from "@linkables/shared/links";

export type SaveSource = (typeof LINK_SOURCES)[number];

// userAgentData is Chromium-only and missing from TypeScript's DOM types.
export type PlatformHints = { userAgent: string; maxTouchPoints: number; userAgentData?: { platform: string } };

const CLIENT_HINT_PLATFORMS: Record<string, SaveSource> = {
  android: "android",
  "chrome os": "chromeos",
  chromeos: "chromeos",
  macos: "mac",
  windows: "windows",
  linux: "linux",
};

const USER_AGENT_PLATFORMS: [RegExp, SaveSource][] = [
  [/iPhone|iPod/, "iphone"],
  [/iPad/, "ipad"],
  [/Android/, "android"],
  [/CrOS/, "chromeos"],
  [/Macintosh|Mac OS X/, "mac"],
  [/Windows/, "windows"],
  [/Linux|X11/, "linux"],
];

export function saveSource({ userAgent, maxTouchPoints, userAgentData }: PlatformHints): SaveSource {
  const hinted = CLIENT_HINT_PLATFORMS[userAgentData?.platform.toLowerCase() ?? ""];
  if (hinted) return hinted;
  const matched = USER_AGENT_PLATFORMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "other";
  // iPadOS Safari sends the Mac user agent; only the touch screen gives it away.
  return matched === "mac" && maxTouchPoints > 1 ? "ipad" : matched;
}
