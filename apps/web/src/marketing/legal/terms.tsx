import type { LongTextDoc } from "./LongTextPage";

export const TERMS_DOC: LongTextDoc = {
  title: "About this self-hosted instance",
  updated: "October 27, 2026",
  short: [
    "Linkables is free, open-source software licensed under AGPL-3.0.",
    "This instance is maintained by its server owner.",
    "Keep your own export or backup of important data.",
  ],
  sections: [
    { id: "software", heading: "The software", body: <p>Linkables is provided under the license included with its source code, without warranty. The source repository and license describe your rights to use, modify, and redistribute it.</p> },
    { id: "instance", heading: "Your account", body: <p>The server owner provides accounts, maintains the instance, and decides its availability and acceptable use. Keep your password private and contact that owner if you need help. Do not use this instance unlawfully or to harm others.</p> },
    { id: "content", heading: "Your sources", body: <p>You remain responsible for the links, notes, and content you save or share. Saving a link does not guarantee the original source will remain available. Export important material and respect the source's access restrictions.</p> },
  ],
};
