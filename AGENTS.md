## Agent skills

### Issue tracker

Issues live as GitHub issues; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Tests

Unit: `npm run test` (or `npx vitest run --project unit`). The integration tests hit a real Supabase project and **require Node 22+** (the bundled `supabase-js` needs the native WebSocket, present only in Node 22+; the default shell is Node 20). Run them through the fnm Node 22 install:

```pwsh
$env:PATH = "C:\Users\Diovanny\AppData\Roaming\fnm\node-versions\v22.12.0\installation;" + $env:PATH
& "C:\Users\Diovanny\AppData\Roaming\fnm\node-versions\v22.12.0\installation\node.exe" "D:\projeto\node_modules\vitest\vitest.mjs" run --project integration
```

Push migrations to the linked remote project with `npx supabase db push --linked`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
