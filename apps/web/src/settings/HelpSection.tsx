import { ChevronRight } from "lucide-react";
import { PRIVACY_PAGE, SUPPORT_PAGE, TERMS_PAGE } from "../marketing/pages";
import { SettingsSection } from "./SettingsSection";

const LINKS = [
  { href: SUPPORT_PAGE.path, label: "Support" },
  { href: PRIVACY_PAGE.path, label: "Privacy" },
  { href: TERMS_PAGE.path, label: "Terms" },
];

// Plain links: in production these pages are prerendered HTML, not app routes.
export function HelpSection() {
  return (
    <SettingsSection title="Help and legal">
      <ul className="flex flex-col">
        {LINKS.map(({ href, label }) => (
          <li key={href} className="border-t border-border first:border-t-0">
            <a href={href} className="flex min-h-[52px] items-center justify-between px-[18px] text-[15px] font-semibold hover:bg-row-hover">
              {label}
              <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
