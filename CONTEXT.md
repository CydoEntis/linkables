# linkables — Glossary

**Resource**
A URL and its extracted metadata (title, description, favicon, thumbnail, content
type). Global: shared by every user who saved that URL. It holds no per-user state;
that lives on the Saved link.

**Saved link**
One user's copy of a Resource: the URL as they submitted it (`original_url`), their
title override, note, pin, and when they saved it. Edits and deletes act on the
Saved link only.

**Inbox**
Each user's saved links that belong to no collection. Saving never requires
choosing a collection. The Inbox is derived, not stored. The UI labels it
**New** (renamed from "To sort" in the 2026-10-24 handoff); code and the API keep the name Inbox (`view=inbox`).

**Collection**
A named set of a user's saved links. One saved link can belong to several
collections. A collection holds no other collections; it can be split into
Groups, one level deep.

**Group**
A named heading inside one collection (at most 20 per collection). A link in a
collection is in one group or ungrouped, and that placement belongs to the
filing, so the same link can sit in a group in one collection and ungrouped in
another. Deleting a group leaves its links in the collection, ungrouped. Not the
day buckets (Today, Yesterday, ...) the design calls "group by".

**Save**
Creating a Saved link in the user's Inbox (or a chosen collection) and, when the
Resource is new, queueing its metadata fetch. A save returns before the metadata
arrives.

**Canonical URL**
The normalised form of a submitted URL (rules in P1-04), used as the Resource's
dedupe key (`resource.canonical_url`). Not the page's `<link rel=canonical>`, which
is stored separately as `rel_canonical_url`.

**Metadata fetch**
The async step that retrieves a Resource's page information, under the rules in
ADR-0003.
