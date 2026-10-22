# linkaroo — Glossary

**Resource**
A URL and its extracted metadata (title, description, favicon, thumbnail, content
type). Global: shared by every user who saved that URL. It holds no per-user state;
that lives on the Saved link.

**Saved link**
One user's copy of a Resource: their title override, note, pin, and when they saved
it. Edits and deletes act on the Saved link only.

**Inbox**
Each user's saved links that belong to no collection. Saving never requires
choosing a collection. The Inbox is derived, not stored.

**Collection**
A named group of a user's saved links. One saved link can belong to several
collections.

**Save**
Creating a Saved link in the user's Inbox (or a chosen collection) and queueing the
Resource's metadata fetch. A save returns before the metadata arrives.

**Metadata fetch**
The async step that retrieves a Resource's page information, under the rules in
ADR-0003.
