import type { LongTextDoc } from "./LongTextPage";

export const SUPPORT_DOC: LongTextDoc = {
  title: "Self-hosted help",
  updated: "October 27, 2026",
  short: [
    "Contact this server's owner for accounts, password resets, and availability.",
    "Install the web app from your browser for convenient phone access.",
    "Connect browser extensions to the same server address.",
  ],
  sections: [
    { id: "sign-in", heading: "Signing in", body: <p>Use the local email and password supplied by your server owner. There is no public signup or emailed sign-in code. If this is a private Tailscale instance, connect your device to the appropriate network first.</p> },
    { id: "phone", heading: "Phone access", body: <p>Open this server's HTTPS address in your phone's browser. Use Add to Home Screen or Install app when available. On supported Android browsers, the installed app can receive shared links. An iPhone Shortcut can open this server's save page; configure it with your own server address.</p> },
    { id: "extension", heading: "Browser extension", body: <p>Use the Chrome or Firefox build for this self-hosted release. Enter this server's address in the extension, allow host access, and sign in. Older hosted-service extension builds use a different authentication system.</p> },
    { id: "data", heading: "Your data", body: <p>Settings contains library export and account deletion. The owner maintains database backups and can restore the instance. Keep your own exports for important links.</p> },
  ],
};
