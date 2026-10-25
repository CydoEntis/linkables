import { LongTextPage } from "./LongTextPage";
import { PRIVACY_DOC } from "./privacy";
import { SUPPORT_DOC } from "./support";
import { TERMS_DOC } from "./terms";

export function PrivacyPage() {
  return <LongTextPage doc={PRIVACY_DOC} />;
}

export function TermsPage() {
  return <LongTextPage doc={TERMS_DOC} />;
}

export function SupportPage() {
  return <LongTextPage doc={SUPPORT_DOC} />;
}
