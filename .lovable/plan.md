# Ship ChatGPT App / MCP integration for real

## Current state (verified)

- `src/lib/mcp-tools.ts` defines 12 tool *descriptors* only — a UI scaffold with no runtime.
- No `src/lib/mcp/` server entry, no `@lovable.dev/mcp-js` install, no `mcpPlugin()` in Vite, no `/mcp` route.
- All project data lives in the browser via `src/lib/store.tsx` (localStorage). There is no per-user backend.

So today ChatGPT has nothing to connect to. This plan makes it real.

## Decisions (from your answers)

- **Access:** Public — no login. This is a **public MCP server**: anyone on the internet with the URL can call these tools. Because the app has no accounts and no server database, the tools only operate on data the caller passes into the call itself — nothing about your local projects is exposed.
- **Tool scope:** read-only inspection · authoring · bundle import/export · templates & snippets.

## What ships

### 1. Install & config
- `bun add @lovable.dev/mcp-js zod`
- `bunfig.toml`: add `@lovable.dev/mcp-js` to `minimumReleaseAgeExcludes`.
- `vite.config.ts`: add `mcpPlugin()` (mounts at `/mcp` — public app, default path is fine).

### 2. MCP server (`src/lib/mcp/`)

Pure functions — no store, no localStorage, no env reads at module scope. Each tool takes a full state blob or the specific input it needs and returns a result. The client-side app can call the same helpers; ChatGPT calls them over MCP.

```
src/lib/mcp/
├── index.ts                       # defineMcp — name, title, version, instructions, tools
└── tools/
    ├── inspect/
    │   ├── list-projects.ts       # in: { bundle } → projects[]
    │   ├── get-project.ts
    │   ├── list-careers.ts
    │   ├── list-traits.ts
    │   ├── list-aspirations.ts
    │   └── list-notifications.ts
    ├── authoring/
    │   ├── create-project.ts      # in: { name, author? } → project + patch
    │   ├── add-career.ts          # in: { project, career } → career + patch
    │   ├── add-trait.ts
    │   ├── add-aspiration.ts
    │   ├── add-notification.ts
    │   ├── set-project-status.ts
    │   └── bump-version.ts
    ├── bundle/
    │   ├── export-bundle.ts       # in: { bundle } → .mcbundle.json string
    │   └── import-bundle.ts       # in: { bundleJson } → validated bundle
    └── templates/
        ├── list-templates.ts      # reads built-in templates from src/lib/builtin-templates.ts
        ├── use-template.ts        # in: { templateId, projectName? } → scaffolded records
        └── list-snippets.ts
```

Every tool gets accurate `title`, one-sentence `description`, and correct `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`). These drive the connector list and how ChatGPT chooses tools.

### 3. Shared contracts
- Reuse the entity types from `src/lib/types.ts` (Career, Trait, Aspiration, NotificationTemplate, Project, Bundle).
- Zod schemas mirror the Property Inspector validation already in the app so ChatGPT-produced content passes the same checks a human would.

### 4. Delete UI-only scaffold
- Remove `src/lib/mcp-tools.ts` and its imports (`Views.tsx`) — the real manifest replaces it. The Settings "App host / MCP" panel is repointed to show the live manifest from `.lovable/mcp/manifest.json`.

### 5. Favicon
- Add a simple favicon (icon-library palette mark) so the connector listing has a proper icon.

### 6. Validate & finish
- Run `app_mcp_server--extract_mcp_manifest` after wiring.
- Tell you the MCP exists but only works after publishing, and surface the Publish action.

## What this means in practice

- After publish, the ChatGPT connector URL is `https://<your-app>.lovable.app/mcp`.
- In ChatGPT: Settings → Connectors → Add → paste that URL. No login prompt.
- ChatGPT can then: list/create projects, add careers/traits/aspirations/notifications, apply built-in templates, and return a downloadable `.mcbundle.json` you import back into the app via the existing Import button.
- Because tools are stateless, ChatGPT works on a bundle you paste in (or a fresh empty one) and returns an updated bundle — your browser stays the source of truth.

## Public-exposure notice

This will be a **public MCP server**: anyone on the internet with the `/mcp` URL can invoke these tools and receive the JSON they return. The tools do **not** read from or write to your local browser store, and they do **not** expose your existing projects — they only operate on what the caller sends in the request. If that changes later (e.g. we add accounts + a real backend), we'd switch to the OAuth path before exposing per-user data.

## Out of scope for this pass

- User accounts / Supabase / OAuth MCP.
- Long-running tools (image generation, large validation sweeps) — MCP is synchronous request/response; those stay in-app.
- Two-way live sync between ChatGPT and your open browser tab (would need a backend).
