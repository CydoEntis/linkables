import { PRIVACY_PAGE, SUPPORT_PAGE, TERMS_PAGE } from "../marketing/pages";
import { SettingsSection } from "./SettingsSection";

const LINKS = [
  { href: SUPPORT_PAGE.path, label: "Support" },
  { href: PRIVACY_PAGE.path, label: "Privacy policy" },
  { href: TERMS_PAGE.path, label: "Terms of use" },
];

// Plain links: in production these pages are prerendered HTML, not app routes.
export function HelpSection() {
  return (
    <SettingsSection title="Help and legal">
      <ul className="flex flex-col">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <a href={href} className="flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
