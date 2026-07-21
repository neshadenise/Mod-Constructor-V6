# UI Action Integration Map — Mod Constructor V6

Companion doc: `CODEX_HANDOFF.md`.
Every entry below classifies a UI action with:

- **Store method** — the function on `StoreAPI` (`src/lib/store.tsx`) it calls, or `local` for transient component state.
- **Status** — one of:
  - `frontend` — fully wired, no backend dependency
  - `local-persist` — persists via the storage adapter; parity work needed only if Codex swaps storage
  - `engine` — needs the real Mod Architect engine (see `src/lib/engine-capabilities.ts`)
  - `network` — needs an external service (lot51.cc, update feeds, etc.)
  - `disabled` — must remain disabled until Codex integrates it
- **I/O** — expected input → output
- **Errors** — user-visible error states

> ⚠️ **Audit scope caveat.** The initial audit hand-off (this doc) ships the
> shared foundation Codex needs — typed contracts, the central store with a
> storage adapter, engine-capability flags, hardened Settings, ChatGPT
> provider removed as active. Per-view rewiring from local `useState` to the
> store is queued below with explicit owners. Any button whose row shows
> `local` today must be migrated to a store method before shipping.

---

## Global chrome

| Action | Component | Store method | Status | I/O | Errors |
|---|---|---|---|---|---|
| Navigate sidebar section | `Sidebar.tsx` | `AppNavigationContext.set` | frontend | `SectionId` → route active | — |
| Open Command Palette (Ctrl/⌘+K) | `CommandPalette.tsx` | `command-registry` | frontend | keystroke → dialog | — |
| Show Keyboard Shortcuts (?/Ctrl+/) | `ShortcutsDialog.tsx` | local | frontend | keystroke → dialog | — |
| Theme toggle | `TopBar.tsx` | `updateSettings({ theme })` | local-persist | click → attr `data-theme` | — |
| Advanced Mode toggle | `Settings.tsx`, `advanced-mode.tsx` | `updateSettings({ advancedMode })` | local-persist | click → sidebar re-renders | — |
| Notification Center open / mark read / dismiss / clear | `NotificationCenter.tsx` | `mark*NotificationRead`, `dismissNotification`, `clearNotifications` | local-persist | — | — |
| Back / breadcrumbs | `TopBar.tsx` | router history | frontend | — | — |

## Dashboard

| Action | Component | Store method | Status | Notes |
|---|---|---|---|---|
| Quick "New Project" | `Dashboard.tsx` | `createProject` | **needs wire-up** — currently `toast.success` only | replace call in `Views.tsx:225` |
| Open recent project | `Dashboard.tsx` | `setActiveProject` + `markRecent` | frontend once wired | — |
| Health cards | `Dashboard.tsx` | derived from `state.validation` | frontend | — |
| Constructor Canvas | `Canvas.tsx` | local | frontend (visual only) | canvas edits are non-persisted preview |

## Projects view

| Action | Store method | Status |
|---|---|---|
| Create / rename / duplicate / delete | `createProject` / `updateProject` / `duplicateProject` / `deleteProject` | frontend |
| Set active | `setActiveProject` | frontend |
| Toggle favorite / tag | `toggleFavorite`, `updateProject` | frontend |
| Import `.mcbundle.json` | `importBundle` | frontend |
| Export active project | `exportBundle` → `downloadBundle` | frontend |
| Confirm dialog on delete | shadcn `AlertDialog` | frontend — **use consistently for all destructive actions** |

## Career Builder

| Action | Store method | Status | Notes |
|---|---|---|---|
| Save Draft | `updateCareer` | **needs wire-up** | `Views.tsx:691` |
| Compile → .package | — | **engine** (`compilePackage`) | show "Requires desktop engine" |
| Apply Template | `createCareer` seeded from `Template.payload` | frontend | — |
| Add rank / branch / message override / WFH event | `updateCareer` with immutable patch | frontend | move from `useState` |
| Copy to other branch/section | `CopyToMenu.tsx` → `updateCareer` bulk | frontend | — |
| Live Preview | `preview/GameUI.tsx` | frontend | reads store row |
| Age gate toggle | `updateCareer({ ageGates })` | frontend | — |

## Trait Builder

Same shape as Career:
- Save Draft → `updateTrait` (currently `toast.success` at `Views.tsx:1613`)
- Compile → **engine** (`compilePackage`)
- Buff add/remove/reorder → `updateTrait({ buffs })`
- Social interactions / buff replacements / commodity weights → `updateTrait`
- Copy XML → `navigator.clipboard.writeText` (frontend)

## Aspiration Builder

- Create / edit milestones, reward trait → `updateAspiration`
- Save / Compile — same pattern as above

## Notification Library

- Create / edit / duplicate / delete templates → `create/update/deleteNotificationTemplate`
- Preview → local live render
- Attach icon → `updateNotificationTemplate({ iconAssetId })` via **asset picker** (see Assets)

## Tuning Editor (advanced)

- Save → `updateSettings` for editor prefs; XML output → **engine** (`produceProductionXml`)
- Copy XML → clipboard (frontend)

## Asset Manager

| Action | Store method | Status |
|---|---|---|
| Upload | `addAsset` with `dataUrl` from `FileReader` | frontend |
| Rename | `updateAsset({ name })` | frontend |
| Move folder | `moveAsset` | frontend |
| Tag / favorite | `updateAsset({ tags, favorite })` | frontend |
| Delete | `deleteAsset` + confirm dialog | frontend |
| Replace | `updateAsset({ dataUrl, sizeBytes, mimeType })` | frontend |
| Preview / crop / resize | `ImageField.tsx` (crop UI) | frontend (CSS transform) — real resize is **engine** later |
| Assign to builder field | `update{Career|Trait|Aspiration|Notification}({ iconAssetId })` | frontend |
| Native folder picker | — | **engine** (`nativeFilePicker`) |

## Templates Gallery

- Save New Template → `saveTemplate` ✅ (already wired to localStorage; migration to `saveTemplate` pending)
- Use Template → `createCareer|Trait|Aspiration` from `Template.payload` — currently `toast.success` only, **needs wire-up**
- Delete custom template → `deleteTemplate`
- Import / Export template → JSON download / file input, uses same `Template` shape

## Snippets Library

- Create / edit / duplicate / delete → `saveSnippet` / `updateSnippet` / `deleteSnippet`
- Copy to clipboard → `navigator.clipboard.writeText` (frontend)
- Filter / search → local

## Validation Center

- Auto-fix → `updateCareer` / `updateTrait` etc. + `dismissValidation`
- Dismiss / ignore warning → `dismissValidation`
- Filter by severity / scope → local
- Jump to field → router navigate to builder + `?field=` search param (needs wire in each builder)
- Re-run validation → `clearValidation('project')` + reseed simulated issues; real check is **engine** (`produceProductionXml`)

## Build Queue

| Action | Store method | Status |
|---|---|---|
| Enqueue simulated build | `enqueueBuild` + client-side interval progresses `updateBuild` | frontend |
| Cancel | `cancelBuild` | frontend |
| Retry | `retryBuild` | frontend |
| Clear finished | `clearBuilds` | frontend |
| Real .package output | — | **engine** (`compilePackage`) writes `BuildJob.outputPath` |
| Install into Mods folder | — | **engine** (`installToModsFolder`) |

## Package Exporter

- Choose export scope, per-folder rename → local
- Build → **engine** (`compilePackage`) — currently `toast.success` at `Views.tsx:2669`, must gate on `engineCapabilities.compilePackage === 'available'` and display the state chip when not

## Reference Viewer

- Search / open field docs → local (bundled markdown)

## Dependency Graph / Activity Timeline / Build Analytics / Project Explorer

- Read-only projections over `state.*`. All frontend.
- Timeline "revert" action → **not yet implemented**; requires per-entity history — see `inspector-history.tsx` for the primitive.

## Update Center

| Action | Status |
|---|---|
| Check for updates | **network** — needs live `lot51.cc` fetch; today only simulates via `toast.success`. Must show "Not connected" until Codex wires a real HTTP client. |
| Install update | **engine** + **network** |

## Settings

| Action | Store method | Status |
|---|---|---|
| Simple / Advanced toggle | `updateSettings({ advancedMode })` | frontend |
| Autosave interval, confirm-before-compile, etc. | `updateSettings` | frontend |
| Sims 4 install path / Mods folder — browse | — | **engine** (`nativeFilePicker`) — text field editable manually |
| Auto-detect Sims 4 install | — | **engine** (`detectSimsInstall`) |
| Check lot51.cc for updates | — | **network** (`fetchThirdPartyTuning`) |
| Reset Demo Data | `resetDemoData` | frontend — clears the storage adapter |
| Export project bundle | `exportBundle` → `downloadBundle` | frontend |
| Import project bundle | `importBundle` | frontend |

## Image / Icon fields (`ImageField.tsx`)

| Action | Status |
|---|---|
| Upload image | frontend |
| Select existing asset | frontend (opens Asset Manager picker) |
| Preview / Crop / Resize / Reposition | frontend (CSS) |
| Rename / Remove / Replace / Assign | frontend |
| AI Generate (ChatGPT) | **disabled** — labeled "Coming later"; the standalone or web build cannot consume a user's ChatGPT subscription |

---

## Buttons that must be wired before ship

These are dead or misleading today. Track each as a Codex ticket:

1. `Dashboard` "New Project" quick-action → `createProject`
2. Career Builder **Save Draft** → `updateCareer`
3. Career Builder **Template** button → `createCareer` from stored template
4. Career Builder **Compile** → gate on `engineCapabilities.compilePackage`
5. Trait Builder **Save Draft** / **Compile** → same pattern
6. Package Exporter **Build** → gate on engine
7. Validation Center **Run** → simulate via store; real check is engine
8. Update Center **Check Now** / **Install** → both engine/network gated
9. Templates Gallery **Use Template** → `createCareer|Trait|Aspiration` from payload
10. Settings **Browse** buttons for install paths → gate on `nativeFilePicker`

Every remaining `toast.success(...)` inside `src/components/mc/Views.tsx` and view files should be reviewed and either linked to a store mutation or converted to a "Requires desktop engine" chip.
