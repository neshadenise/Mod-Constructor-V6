# Codex Handoff — Mod Constructor V6

This document is the transfer package from the prototype UI to the Codex
engineering team that will connect the real Mod Architect engine, native
file system, and update services.

Companion: `UI_ACTION_INTEGRATION_MAP.md` — per-button classification.

---

## 1. Architecture overview

- **Framework**: TanStack Start v1 on Vite 7, React 19, Tailwind v4, shadcn/ui.
- **Runtime hosts**: this prototype targets a browser preview, a future
  standalone desktop (Tauri or Electron), and optionally an embedded
  ChatGPT App surface. Detection lives in `src/lib/app-host.tsx`.
- **State**: a single React context store — `StoreProvider` in
  `src/lib/store.tsx` — persisted through a swappable `StorageAdapter`
  (`src/lib/storage-adapter.ts`). No component owns long-lived state.
- **Data contracts**: `src/lib/types.ts` defines every persisted entity.
  Every mutation goes through the store's typed methods.
- **Persistence**: default adapter is `localStorage` with the namespace
  `mc.v6.`. Codex swaps this for real file storage on desktop, SQLite via
  Tauri/Electron IPC, or a cloud sync backend — no UI change required.

```
src/
  routes/index.tsx            # mounts providers + top-level chrome
  lib/
    types.ts                  # Project, Career, Trait, Aspiration, Buff, ...
    storage-adapter.ts        # StorageAdapter interface + localStorage impl
    store.tsx                 # StoreProvider + useStore()
    engine-capabilities.ts    # feature flags for engine-dependent actions
    app-host.tsx              # host mode + image-provider state
    advanced-mode.tsx         # simple/advanced UX toggle
    notifications.tsx         # transient toast layer (in-app)
    inspector-history.tsx     # per-field undo/redo primitive
    command-registry.ts       # Command Palette entries
  components/mc/
    Sidebar.tsx MenuBar.tsx TopBar.tsx StatusBar.tsx
    Dashboard.tsx Canvas.tsx CommandPalette.tsx
    NotificationCenter.tsx ShortcutsDialog.tsx
    ImageField.tsx CopyToMenu.tsx
    Views.tsx                 # in-place router for every non-dashboard section
    inspector/                # PropertyField primitive
    preview/                  # GameUI + PreviewShell
    views/                    # ProjectExplorer, AssetManager, ReferenceViewer,
                              # ValidationCenter, TemplatesGallery,
                              # SnippetsLibrary, DependencyGraph,
                              # ActivityTimeline, BuildAnalytics, UpdateCenter
    sections.ts               # SectionId + labels
```

## 2. Routes and sections

Single top-level route `/` (`src/routes/index.tsx`) mounts:

- `<ThemeProvider>`
- `<AdvancedModeProvider>`
- `<AppHostProvider>`
- `<StoreProvider>` (adapter defaults to `localStorageAdapter`)
- `<AppNavigationProvider>` (holds active `SectionId`)
- `<InspectorHistoryProvider>` (per-field undo/redo)
- `<NotificationsProvider>` (toast layer)
- `<CommandPalette />` `<NotificationCenter />` `<ShortcutsDialog />`

The `SectionId` union in `src/components/mc/sections.ts` is the exhaustive
list of workspace sections. `Sidebar.tsx` groups them into Workspace /
Builders / Insights / Advanced. `SectionView` in `Views.tsx` renders the
matching component.

## 3. Data contracts (see `src/lib/types.ts`)

Top-level slices on `AppState`:

- `projects: Project[]` — with `activeProjectId`
- `careers: Career[]` — `CareerBranch[]`, `CareerLevel[]`, `WFHEvent[]`, `CareerMessage[]`
- `traits: Trait[]` — `Buff[]`, replacements, commodity weights, gates
- `aspirations: Aspiration[]` — `Milestone[]`
- `notifications: NotificationTemplate[]`
- `assets: Asset[]`
- `templates: Template[]`
- `snippets: Snippet[]`
- `validation: ValidationIssue[]`
- `builds: BuildJob[]`
- `appNotifications: AppNotification[]`
- `activity: ActivityEvent[]`
- `settings: AppSettings`
- `recent: ID[]`, `favorites: ID[]`

`ProjectBundle` is the interchange format for `.mcbundle.json`. See
`store.exportBundle` / `store.importBundle`.

## 4. Central store (see `src/lib/store.tsx`)

`useStore(): StoreAPI` returns typed methods for every mutation. Semantics:

- Every mutation stamps `updatedAt`, updates parent-project `updatedAt`, and
  logs an `ActivityEvent` for create / update / delete / build / export /
  import so the Activity Timeline is always accurate.
- Persistence is debounced (250 ms) and writes the full `AppState` blob
  through the adapter. Codex should switch to per-slice writes when moving
  off localStorage — the store API does not need to change.
- `resetDemoData()` clears the adapter and reseeds with a blank project.
  This is the button exposed in Settings.
- Bundle import remaps every ID so the same project can be imported
  multiple times without collision.

## 5. Storage adapter (see `src/lib/storage-adapter.ts`)

```ts
interface StorageAdapter {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  readonly label: string;
}
```

Provided:

- `localStorageAdapter` — browser default, namespace `mc.v6.`.
- `createMemoryAdapter()` — SSR/test fallback.

Codex targets to build:

- `nodeFileSystemAdapter({ dataDir })` — writes `state.json` and
  `assets/<id>.<ext>` under `<userdata>/ModConstructor`.
- `sqliteAdapter({ database })` — one row per store key or a normalized
  schema; either works because the store reads the whole blob today.
- `cloudSyncAdapter({ endpoint, token })` — remote JSON blob storage.

Swap in `src/routes/index.tsx` via
`<StoreProvider adapter={myAdapter}>`.

## 6. Host capabilities (`src/lib/app-host.tsx`)

- `mode`: `"desktop"` (default) or `"chatgpt"` when the OpenAI Apps SDK
  injects `window.openai`.
- `availableImageProviders` — array; **`chatgpt` is intentionally not an
  active provider** in the desktop / web build. See §7.
- `canExportToDesktop` is always true because bundles are portable JSON.

## 7. Engine-dependent placeholders (`src/lib/engine-capabilities.ts`)

Every real-engine action is a flag with an explicit state string:

- `compilePackage`, `installToModsFolder`, `detectSimsInstall`,
  `readGameFiles`, `produceProductionXml`, `nativeFilePicker` → default
  `requires-desktop-engine`
- `fetchThirdPartyTuning` → default `not-connected`
- `chatgptImageGeneration` → default `coming-later`

UI must render one of the labels in `ENGINE_STATE_LABEL`, disable the
control, and expose the tooltip from `ENGINE_STATE_TOOLTIP`. Codex flips
each flag to `"available"` once the corresponding native/service
implementation lands.

**ChatGPT image generation is explicitly not a live provider.** The
prototype's Image Generation card lists it as a disabled "Coming later"
tile because neither the standalone desktop app nor the web build can
consume a user's ChatGPT subscription. Do not re-enable this without a
supported API path.

## 8. Persistence contract

- Prototype: everything is JSON-serializable and persisted via the
  storage adapter. Assets embed `dataUrl` for portability.
- Desktop: replace `dataUrl` with `filePath` (Codex will write asset
  bytes to `<userdata>/ModConstructor/assets/<id>.<ext>` and update
  `Asset.filePath`). `dataUrl` stays supported for imported bundles.
- Bundle IO: `ProjectBundle` v2 embeds assets inline so the file is
  self-contained.

## 9. Remaining desktop integration work

Priority order for Codex:

1. **Native file system adapter** — mirrors `StorageAdapter`, writes
   under `<userdata>/ModConstructor`. Blocks nothing else.
2. **`compilePackage`** — the core engine. Consumes a `Project` +
   scoped rows, emits a `.package`, updates `BuildJob.outputPath`.
3. **`installToModsFolder`** — copies `.package` under
   `AppSettings.modsFolderPath` with confirm dialog.
4. **`detectSimsInstall`** — probes registry / typical paths on
   Windows/macOS; writes `AppSettings.simsInstallPath`.
5. **`nativeFilePicker`** — for install path browse buttons and asset
   upload/replace (drop the `dataUrl` fallback on desktop).
6. **`fetchThirdPartyTuning`** — HTTP client against `lot51.cc` update
   feeds; drives Update Center and the Settings "Check Now" button.
7. **`produceProductionXml`** — real XML generation for the Tuning
   Editor + Validation Center. The current previews are placeholders.
8. **Real validation** — replace the simulated seeder with the engine's
   validator; keep `ValidationIssue` shape identical.
9. **Auto-updater** — Codex chooses the mechanism; must respect
   `AppSettings.autoUpdate`.

## 10. Ship checklist (per audit brief)

- [ ] Every workspace section reachable from sidebar / palette / shortcuts.
- [ ] Every destructive action guarded by an `AlertDialog` confirm.
- [ ] Every builder Save/Compile button routed to the store OR gated on
      the correct `engineCapabilities` flag.
- [ ] Every `toast.success` inside a builder either follows a real store
      mutation or is replaced with an engine-state chip.
- [ ] `Reset Demo Data` in Settings clears the adapter and reseeds.
- [ ] Export → refresh → import round-trip preserves a project.
- [ ] No control claims ChatGPT subscription integration.
- [ ] `bunx tsgo` passes with zero errors.

## 11. Known follow-ups (frontend-only, small)

- Migrate remaining per-builder `useState` local drafts to `updateCareer`
  / `updateTrait` / `updateAspiration` mutations.
- Wire Command Palette entries to `store.*` methods where they still call
  `toast.success` placeholders.
- Replace `latestGeneratedImage` in `src/lib/project-store.ts` (legacy v1)
  with a `state.assets` selector, then delete the legacy file.
- Add per-view `jump-to-field` from Validation Center using a `?field=`
  search param.
