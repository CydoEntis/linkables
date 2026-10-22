# linkaroo

Save any URL in seconds, find it later from any device, share it when needed.

**Status:** Phase 1 (personal MVP) is planned; no code yet.

## Where things are

- [`docs/PLANNING.md`](docs/PLANNING.md): goal, scope, phases, rules and the
  ticket map. Start here.
- [`docs/adr/`](docs/adr/): architecture decisions (stack, Supabase, metadata
  fetching, data model, hosting).
- [`CONTEXT.md`](CONTEXT.md): what the words mean (Resource, Saved link, Inbox, ...).
- [`AGENTS.md`](AGENTS.md): rules for anyone (human or agent) writing code here,
  and how a ticket gets worked.
- Tickets: Plane project `linkaroo` (LNK-1 onward).

## Develop

Created by P1-01 and P1-17; until then there is nothing to run.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in values
pnpm verify                              # typecheck + lint + test
```
