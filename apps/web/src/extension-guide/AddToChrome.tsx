import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { FIREFOX_ADDON_URL, isFirefox } from "./browser";
import { CHROME_WEB_STORE_URL, EXTENSION_GUIDE_PATH } from "./path";

type ButtonLook = Parameters<typeof buttonVariants>[0];

// Straight to the Chrome Web Store once the listing is live; until then, the by-hand install guide.
// Firefox gets the signed add-on, which it installs on click.
export function AddExtensionLink({ look, firefox = isFirefox() }: { look: ButtonLook; firefox?: boolean }) {
  const className = buttonVariants(look);
  if (firefox) {
    return (
      <a href={FIREFOX_ADDON_URL} className={className}>
        Add to Firefox
      </a>
    );
  }
  if (CHROME_WEB_STORE_URL !== undefined) {
    return (
      <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noopener noreferrer" className={className}>
        Add to Chrome
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link to={EXTENSION_GUIDE_PATH} className={className}>
      Add to Chrome
    </Link>
  );
}

// Lucide dropped its brand icons; this is its old Chrome outline.
export function ChromeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="21.17" x2="12" y1="8" y2="8" />
      <line x1="3.95" x2="8.54" y1="6.06" y2="14" />
      <line x1="10.88" x2="15.46" y1="21.94" y2="14" />
    </svg>
  );
}
