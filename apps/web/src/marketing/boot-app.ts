export const APP_BOOT_ATTRIBUTE = "data-app-boot";

// Self-hosted instances open the app immediately; sessions live in HttpOnly cookies.
export function bootAppIfNeeded(entrySrc: string, doc: Document): boolean {
  doc.documentElement.setAttribute("data-app-boot", "");
  const script = doc.createElement("script");
  script.type = "module";
  script.src = entrySrc;
  doc.head.appendChild(script);
  return true;
}

export function bootScript(entrySrc: string): string {
  const src = JSON.stringify(entrySrc).replace(/</g, "\\u003c");
  return `(${bootAppIfNeeded.toString()})(${src},document)`;
}
