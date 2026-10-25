import { SUPPORT_EMAIL } from "../pages";
import type { LongTextDoc } from "./LongTextPage";

const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export const SUPPORT_DOC: LongTextDoc = {
  title: "Support",
  updated: "October 24, 2026",
  short: [
    <>Email {mail} and a real person replies, usually within a couple of days.</>,
    <>
      Many answers are in the <a href="/#faq">questions on the home page</a>.
    </>,
    "You can export your links yourself, any time.",
  ],
  sections: [
    {
      id: "contact",
      heading: "Contact us",
      body: <p>Email {mail}. Tell us which device and browser you use, and what happened. A screenshot helps.</p>,
    },
    {
      id: "faq",
      heading: "Common questions",
      body: (
        <p>
          The <a href="/#faq">questions on the home page</a> cover which devices work, whether it's free, privacy, export, and the Chrome extension and
          iPhone app.
        </p>
      ),
    },
    {
      id: "export",
      heading: "Export your links",
      body: (
        <p>
          In linkables, open your account menu (your initial, at the top) and choose Export my links. You get one JSON file with every link, note and
          collection.
        </p>
      ),
    },
    {
      id: "delete",
      heading: "Delete your account",
      body: (
        <p>
          Email {mail} from the address you sign in with and ask us to delete your account. We delete your account, links, notes and collections within
          30 days and tell you when it's done. Export your links first if you want to keep them.
        </p>
      ),
    },
    {
      id: "iphone",
      heading: "Saving from iPhone and iPad",
      body: (
        <>
          <p>
            Saving from the Share menu uses the Save to linkables shortcut. After signing in, open your account menu and choose Save from anywhere to add
            it.
          </p>
          <p>If Save to linkables doesn't show in Share, scroll to the end of the list, tap Edit Actions, and turn it on.</p>
        </>
      ),
    },
    {
      id: "android",
      heading: "Saving from Android",
      body: (
        <p>
          Open linkables.app in Chrome and sign in. Tap the ⋮ menu, then Install app (or Add to Home screen). After that, linkables shows up when you tap
          Share in any app.
        </p>
      ),
    },
    {
      id: "sign-in",
      heading: "Trouble signing in",
      body: (
        <p>
          Sign in with Google, or with the 6-digit code we email you. Type the code on the device you want to sign in on; the email also has a link
          that does the same. The code and the link each work once, for an hour. If the email doesn't arrive, check your spam folder, or ask for a
          new one.
        </p>
      ),
    },
  ],
};
