import { SUPPORT_EMAIL } from "../pages";
import type { LongTextDoc } from "./LongTextPage";

const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export const PRIVACY_DOC: LongTextDoc = {
  title: "Privacy policy",
  updated: "October 26, 2026",
  short: [
    "We store the links you save, and what you add to them, so you can find them on any device.",
    "No ads, no analytics, no tracking, and we never sell your data.",
    "You can export everything any time, and delete your account yourself in Settings.",
  ],
  sections: [
    {
      id: "who",
      heading: "Who we are",
      body: (
        <p>
          linkables is a small app made and run by Cody Stine. In this policy, "we" means the people running linkables. If you have a question about your
          data, email {mail}.
        </p>
      ),
    },
    {
      id: "what",
      heading: "What we store",
      body: (
        <>
          <p>To run your account and your library, we store:</p>
          <ul>
            <li>
              <strong>Your account:</strong> your email address, and how you sign in (Google, or a code we email you). If you sign in with Google, Google also
              shares your name and profile picture with our sign-in provider. We don't use them.
            </li>
            <li>
              <strong>Your links:</strong> each address you save, when you saved it, the kind of device you saved it from (like iPhone or Windows), and
              anything you add: a title, a note, a pin, and the collections you put it in.
            </li>
            <li>
              <strong>Page details:</strong> the title, description, preview image address and icon address of each page you save (see below).
            </li>
          </ul>
          <p>We don't store your passwords, because there are none, and we don't store your browsing history.</p>
        </>
      ),
    },
    {
      id: "pages",
      heading: "Fetching the pages you save",
      body: (
        <>
          <p>
            After you save a link, our server visits that address, following any redirects and trying again if it fails, to read the page's title,
            description and preview image. The visit comes from our
            server, not your device, and carries no cookies or details about you. Page details are stored once per address, so if two people save the same
            page they share its title and picture. Nobody can see who else saved it.
          </p>
          <p>
            If you open a page in the reader, our server visits it the same way and stores a readable copy of the article's text and image addresses with
            the page details, refreshing it when it's more than a week old.
          </p>
          <p>
            Preview images, site icons and images in the reader load in your browser straight from the site they belong to (for example YouTube). Like any image on the web, that
            site can see your IP address when your browser loads it. We tell your browser not to send it your linkables address.
          </p>
        </>
      ),
    },
    {
      id: "use",
      heading: "How we use it",
      body: (
        <>
          <p>We use your data only to run linkables for you: to sign you in, show and search your links, and keep them in sync across your devices.</p>
          <p>
            There are no ads in linkables, no analytics or tracking scripts, and no profile of you. We don't sell your data or share it with anyone except
            the providers below, who process it only to run the service.
          </p>
          <p>
            If you turn on a collection's share link, anyone with that link can see the collection's name and its links' addresses, titles, descriptions and
            preview images, without signing in. They can't see your notes, your pins or who you are. Turning the link off stops it working right away.
          </p>
        </>
      ),
    },
    {
      id: "providers",
      heading: "Where your data lives",
      body: (
        <ul>
          <li>
            <strong>Supabase</strong> runs our sign-in and database. Your account and links are stored in its US East region (Virginia, USA). Supabase also keeps sign-in logs, which include IP addresses.
          </li>
          <li>
            <strong>OVHcloud</strong> hosts the linkables website and server, in Vint Hill, Virginia, USA.
          </li>
          <li>
            <strong>Resend</strong> sends the sign-in emails, from noreply@linkables.app, so it receives your email address when you ask for a sign-in code. It also
            delivers each access request to us, and, when you delete your account, a note with your email address and account ID so we can remove your
            sign-in.
          </li>
          <li>
            <strong>Google</strong>, only if you choose Continue with Google, confirms who you are and tells us your email address.
          </li>
        </ul>
      ),
    },
    {
      id: "browser",
      heading: "Cookies and local storage",
      body: (
        <p>
          linkables uses no tracking cookies. Your browser's local storage keeps your sign-in session, so you stay signed in, and a few display
          settings. Signing out removes the session.
        </p>
      ),
    },
    {
      id: "web",
      heading: "The web app",
      body: (
        <p>
          The web app at linkables.app, including the installed app on Android, sends us only what you do in it: the links you save or share to it and the
          changes you make. On Android, sharing to linkables sends the link, title and text of what you shared, and nothing else on your phone.
        </p>
      ),
    },
    {
      id: "extension",
      heading: "The Chrome extension (beta)",
      body: (
        <p>
          The Chrome extension reads the address and title of a tab only after you use linkables on that tab: by clicking linkables in the toolbar,
          pressing its side panel shortcut, or choosing Save link to linkables from the right-click menu. It sends the address to your account to save
          it, and while its side panel is open it sends the address to check whether you've saved that page before; the title is only shown in the
          extension. Saving a link from the right-click menu sends that link's address. It keeps your sign-in in Chrome's storage for the extension. It
          doesn't read what you type into pages, your passwords, or your browsing history.
        </p>
      ),
    },
    {
      id: "iphone",
      heading: "iPhone and iPad",
      body: (
        <>
          <p>
            Today, the Save to linkables shortcut takes the link you share and opens it in linkables.app in your browser, which saves it to your account.
            The shortcut runs in Apple's Shortcuts app and reads nothing else on your device.
          </p>
          <p>
            An iPhone app is planned. Like the shortcut, it will only send the links you share to it. We'll update this section before it ships.
          </p>
        </>
      ),
    },
    {
      id: "access-requests",
      heading: "Access requests",
      body: (
        <p>
          While linkables is invite-only, you can ask for access with the form at linkables.app/request-access. We keep the email address, and the
          optional name and note you send, with the time and the kind of browser you sent it from, only to decide on and send beta invites. Your IP
          address is used briefly, in our server's memory, to limit repeat requests, and is never stored. Each request is also sent to us by email through Resend. We keep requests until the beta ends, or until you
          ask us to delete yours at {mail}.
        </p>
      ),
    },
    {
      id: "export-delete",
      heading: "Export and delete",
      body: (
        <>
          <p>
            You can download everything any time: open your account menu and choose Export my links. You get one JSON file with every link, note and
            collection.
          </p>
          <p>
            To delete your account, open your account menu, choose Settings, then Delete account. Your links, notes and collections are deleted right
            away, and any share links stop working. We remove your sign-in record, your email address and how you sign in, from Supabase within 30
            days. Page details stay, because they aren't tied to you.
          </p>
          <p>If you can't sign in, email {mail} from the address you sign in with and we'll delete your account for you.</p>
        </>
      ),
    },
    {
      id: "logs",
      heading: "Server logs",
      body: (
        <p>
          Our server keeps short technical logs to find and fix problems: the time, the kind of request, and whether it worked. Logged web addresses have
          their query strings removed, so a saved link's details don't end up in our logs.
        </p>
      ),
    },
    {
      id: "children",
      heading: "Children",
      body: <p>linkables isn't meant for children under 13, and we don't knowingly keep data about them.</p>,
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      body: <p>If we change this policy, we update this page and the date at the top. If a change affects how we use your data, we'll email you first.</p>,
    },
    {
      id: "contact",
      heading: "Contact",
      body: <p>Questions about your data, or a request to see, correct or delete it: email {mail}.</p>,
    },
  ],
};
