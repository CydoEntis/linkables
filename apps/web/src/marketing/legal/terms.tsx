import { PRIVACY_PAGE, SUPPORT_EMAIL } from "../pages";
import type { LongTextDoc } from "./LongTextPage";

export const TERMS_DOC: LongTextDoc = {
  title: "Terms of use",
  updated: "October 24, 2026",
  short: [
    "Use linkables to save, organise and find links.",
    "Don't use it for anything illegal or to harm others.",
    "You own what you save. linkables is free and provided as it is.",
  ],
  sections: [
    {
      id: "agreement",
      heading: "Using linkables",
      body: (
        <p>
          These terms apply when you use linkables at linkables.app and its apps. By creating an account or using linkables, you agree to them. If you
          don't agree, please don't use linkables.
        </p>
      ),
    },
    {
      id: "account",
      heading: "Your account",
      body: (
        <p>
          You need a free account, signed in with Google or with a code we email you. Keep access to that email account safe, because it's how you get into
          linkables. One account is for one person. You must be at least 13 to use linkables.
        </p>
      ),
    },
    {
      id: "content",
      heading: "Your links",
      body: (
        <>
          <p>
            You own the links, notes and collections you save. You let us store and process them only to run linkables for you, including visiting the
            pages you save to read their title and picture.
          </p>
          <p>
            How we handle your data is in the <a href={PRIVACY_PAGE.path}>privacy policy</a>.
          </p>
        </>
      ),
    },
    {
      id: "rules",
      heading: "Fair use",
      body: (
        <>
          <p>Please don't:</p>
          <ul>
            <li>use linkables for anything illegal, or to store or spread content that's illegal where you live;</li>
            <li>try to get into other people's accounts or data, or get around our security;</li>
            <li>overload the service, for example by saving links in bulk with scripts, or use it to make our server hammer other websites.</li>
          </ul>
          <p>If you break these rules, we may suspend or close your account. Where we can, we'll tell you first and let you export your links.</p>
        </>
      ),
    },
    {
      id: "service",
      heading: "The service",
      body: (
        <>
          <p>
            linkables is free. We work hard to keep it running and your links safe, but it's provided as it is, without warranties. Export your links now
            and then if they matter to you.
          </p>
          <p>
            We may change, add or remove features. If we ever shut linkables down, we'll email you at least 30 days before, so you can export everything.
          </p>
        </>
      ),
    },
    {
      id: "liability",
      heading: "Liability",
      body: (
        <p>
          To the extent the law allows, we aren't liable for indirect or consequential losses, or for lost data, from using linkables. Nothing in these
          terms limits rights you have by law that can't be limited.
        </p>
      ),
    },
    {
      id: "ending",
      heading: "Ending your account",
      body: (
        <p>
          You can stop using linkables at any time. To delete your account and everything in it, open Settings and choose Delete account, or email{" "}
          {SUPPORT_EMAIL} from the address you sign in with.
        </p>
      ),
    },
    {
      id: "law",
      heading: "Governing law",
      body: <p>These terms are governed by the laws of the State of New Jersey, USA.</p>,
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      body: <p>If these terms change, we update this page and the date at the top. For changes that matter, we'll email you before they take effect.</p>,
    },
    {
      id: "contact",
      heading: "Contact",
      body: (
        <p>
          Questions about these terms: email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      ),
    },
  ],
};
