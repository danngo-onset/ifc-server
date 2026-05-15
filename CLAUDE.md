@../foundry/.claude/rules/code-quality.md
@../foundry/.claude/rules/follow-user-scope.md
@../foundry/.claude/rules/typescript-patterns.md

# ifc-server

Node + Express + TypeScript companion server to the foundry viewer (sibling repo at [../foundry/](../foundry/)). Converts uploaded IFC files into `@thatopen` `.frag` fragments via `IfcImporter`, persists them to disk under [storage/fragments/](storage/fragments/), and serves them back by UUID.

## Single source of truth — foundry

Shared conventions, coding rules, and the canonical overview of this repo live in foundry. Do not duplicate them here.

- [../foundry/CLAUDE.md](../foundry/CLAUDE.md) — agent stance, doc/link conventions, bash-output discipline
- [../foundry/.claude/rules/](../foundry/.claude/rules/) — all rules (the three above are `@import`ed; the rest are scoped to foundry's frontend)
- [../foundry/.claude/docs/streaming-lod/ifc-server-overview.md](../foundry/.claude/docs/streaming-lod/ifc-server-overview.md) — canonical overview: stack, storage layout, CORS, what's missing for streaming, Node 2 GB Buffer ceiling

## Endpoints

| METHOD | PATH | PURPOSE | SOURCE |
|---|---|---|---|
| GET | `/` | Health check | [src/index.ts:47-49](src/index.ts#L47-L49) |
| GET | `/fragments/:id` | Read `.frag` from disk → raw `application/octet-stream` | [src/index.ts:51-62](src/index.ts#L51-L62) |
| POST | `/fragments` | Upload IFC → `IfcImporter.process()` → save + raw `.frag` body, UUID returned in `X-Fragments-Id` header | [src/index.ts:64-92](src/index.ts#L64-L92) |

## Files

| Topic | File |
|---|---|
| Express app, routes, IFC → fragments conversion | [src/index.ts](src/index.ts) |
| Disk I/O for `.frag` files (init / save / load) | [src/storage-utilities.ts](src/storage-utilities.ts) |
| Persisted fragment storage (UUID-keyed `.frag` files) | [storage/fragments/](storage/fragments/) |
