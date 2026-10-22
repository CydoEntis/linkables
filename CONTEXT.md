# linkaroo — Glossary

**Resource**
A saved external URL and its extracted metadata (title, description, favicon,
thumbnail, content type). Shared across users when the URL is the same; the
user's own notes and state are separate.

**Inbox**
Each user's default place for a new save. Saving never requires choosing a
collection.

**Collection**
A named group of resources. One resource can belong to several collections.

**Save**
Creating a resource in the user's Inbox (or a chosen collection) and queueing its
metadata fetch. A save returns before the metadata arrives.

**Metadata fetch**
The async step that retrieves a resource's page information, under the rules in
ADR-0003.
