import type { LongTextDoc } from "./LongTextPage";

export const PRIVACY_DOC: LongTextDoc = {
  title: "Privacy on this server",
  updated: "October 27, 2026",
  short: [
    "This Linkables instance is operated by its server owner.",
    "Your account and library are stored in the instance's local database.",
    "Ask the server owner about access, backups, retention, and any optional email service.",
  ],
  sections: [
    { id: "account", heading: "Account and library", body: <p>The instance stores your email, name, a password hash, sessions, saved addresses, notes, pins, and collection membership. The web app uses an HttpOnly session cookie. The browser extension stores its selected server and session token in extension storage. Display preferences may be stored in your browser.</p> },
    { id: "sources", heading: "Saved pages", body: <p>The server visits saved public addresses to retrieve page details and, when requested, readable article content. It does not forward your browser's login cookies. Remote icons and images may load directly from their original sites, which can see your IP address.</p> },
    { id: "sharing", heading: "Sharing", body: <p>Enabling a collection's share link makes the selected collection content available to people who can reach this server and have the link. Private shares additionally use the configured email verification service. Personal notes are not included in shared collection responses.</p> },
    { id: "hosting", heading: "Hosting and optional services", body: <p>The software does not require Supabase or a centrally operated Linkables service. The server owner controls where it runs and whether optional email delivery or remote access services are configured. Tailscale access controls server reachability; local accounts still control access to personal libraries.</p> },
    { id: "export-delete", heading: "Export and deletion", body: <p>Use Settings to export your library or delete your account. Server backups may retain earlier copies according to the owner's backup policy. Contact the server owner for password resets and questions about retained backups.</p> },
  ],
};
