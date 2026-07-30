# Mod Constructor V6 — App Feature & UI Changelog

Scope: **creator desktop application only.** Nothing about the public marketing
website (landing page, About/Support/Privacy pages, SEO, robots.txt) belongs in
this file. This document is the porting ledger for the Avalonia 11 / .NET 8
macOS + Windows rebuild.

Companion docs:
- `CODEX_APP_PAGES_SPEC.md` — per-page field-level replica spec
- `CODEX_AVALONIA_UI_SPEC.md` — token/control mapping for Avalonia
- `UI_ACTION_INTEGRATION_MAP.md` — button → action → data contract map

## How to maintain this file

Every change to app features or app UI adds an entry at the top of
**Unreleased**, using this shape:

```
### <Area> — <short title>
- **Feature:** what the user can now do.
- **UI:** layout, controls, states, empty/error states.
- **Data:** types/store fields touched (`src/lib/...`).
- **Avalonia:** the equivalent control/pattern to build (View + ViewModel).
```

Rules:
- One entry per user-visible capability, not per file edit.
- Always name the concrete WPF/Avalonia control equivalent.
- Record removals and renames explicitly — the port must not resurrect them.
- Website-only changes: do not log here.

---

## Unreleased

### Pack Mechanics — new builder category
- **Feature:** Club Settings, Royalty & Nobility, Legacy & Dynasty, and generic
  pack-specific mechanics are authorable per project and emit structured
  project data (not mockups). Catalog covers 18 EA packs with per-mechanic
  field templates. Validation flags impossible condition combinations,
  circular title hierarchies, and missing STBL keys.
- **UI:** Dashboard gains a "Pack Mechanics" category card group; hub view with
  four category editors. Shared editors: condition builder (AND/OR/NOT tree),
  localization row (STBL key + fallback string), resource selector (binds by
  stable UUID), notification editor with in-game style preview, loot action
  list.
- **Data:** `src/lib/packs/{types,catalog,validate}.ts`; `packModules` added to
  the project schema in `src/lib/types.ts`; CRUD + scoped undo/redo in
  `src/lib/store.tsx`.
- **Avalonia:** hub = `TabControl` of category views; condition builder =
  recursive `TreeDataGrid` with a node DataTemplate selector; notification
  preview = `Border` + `DropShadowEffect` card in a right-hand preview pane.
- **Remaining:** sidebar navigation entry and build-manifest wiring.

### Community Library — Beta (frontend + adapter)
- **Feature:** browse/upload/moderate shared resources under strict free-tier
  limits (2 MB resource, 500 KB preview, 10 uploads per user, JSON only,
  manual moderation). Browser-side WebP compression before upload.
- **UI:** four tabs — Browse, My Uploads, Upload (with inline validation),
  Admin (moderation queue). Header labelled "Community Library — Beta" with a
  free-cloud-capacity notice. When no backend is configured the whole view
  renders the "Community service not configured" empty state.
- **Data:** `src/lib/community/{types,image,validate}.ts`;
  `NullCommunityAdapter` is the default implementation.
- **Avalonia:** `TabControl` + virtualized `ItemsRepeater` grid; uploads via
  `IStorageProvider.OpenFilePickerAsync`; compression through ImageSharp
  (SkiaSharp fallback) on a background thread.

---

## Shipped

### Shell & chrome
- **Feature:** desktop-app shell — custom window chrome, menu bar, grouped
  sidebar sections (Builders / Resources / Library / System), status bar with
  an Offline ⇄ lot51 sync indicator, OS detection (Windows/macOS) driving
  path defaults and an `OsBadge`.
- **UI:** left navigation rail with collapsible groups; top bar showing active
  project, status, and theme toggle; bottom status bar for build/sync state.
- **Data:** `MenuBar.tsx`, `Sidebar.tsx`, `StatusBar.tsx`, `TopBar.tsx`,
  `Views.tsx`, `sections.ts`.
- **Avalonia:** `Window` with `ExtendClientAreaToDecorationsHint="True"`,
  native macOS menu via `NativeMenu.Menu`, sidebar = `TreeView` with grouped
  `ItemsControl`, status bar = `DockPanel` bottom dock.

### Theming & design system
- **Feature:** light/dark themes (soft white vs deep navy-black) with cyan/teal
  accents; OKLCH token set; Fredoka display + body pairing.
- **UI:** dense professional IDE aesthetic, 1600×900 target layout, no EA
  branding.
- **Data:** `src/styles.css` tokens; theme provider persists user choice.
- **Avalonia:** `FluentTheme` + `ResourceDictionary` per variant with
  `ThemeVariantScope`; convert OKLCH tokens to sRGB hex (table in
  `CODEX_AVALONIA_UI_SPEC.md`).

### Advanced Mode gating
- **Feature:** an "Interface Mode" setting hides advanced surfaces (Tuning
  Editor, Validation, Build Logs, internal IDs) so non-coders see a simple UI.
- **Data:** `src/lib/advanced-mode.tsx`, persisted.
- **Avalonia:** bind `IsVisible` to `AppSettings.AdvancedMode` via a shared
  ViewModel; do not duplicate views.

### Projects, lifecycle & versioning
- **Feature:** create/import/delete projects; project status transitions;
  semantic version bumps; every new version is marked complete and auto-writes
  a changelog entry. Demo project ships as the deletable default. Selecting a
  project re-scopes the entire app (builders, assets, exporter, explorer).
- **UI:** Projects view grid, Dashboard "Current Project" card with health
  indicators, `ProjectDetailDialog`, Project Explorer tree derived live from
  store state.
- **Data:** `src/lib/types.ts` (`status`, `version`, `changelog`),
  `src/lib/store.tsx` with a `StorageAdapter` seam.
- **Avalonia:** `ObservableCollection<Project>` in an app-scoped store service;
  Explorer = `TreeDataGrid`; storage adapter → JSON files under
  `ApplicationData`.

### Career Builder (V5 parity)
- **Feature:** identity fields, dynamic rank/level system (start times,
  uniforms, objectives), work-from-home events, 19 message overrides, age
  availability, advanced performance statistics.
- **UI:** master-detail — level list on the left, tabbed detail on the right.
- **Avalonia:** `ListBox` + `TabControl`; levels reorderable via drag adorner.

### Trait Builder (V5 parity)
- **Feature:** Personality/Gameplay trait types, age gates, 15 emotional buff
  models, voice effects, aging blocks, social interaction and buff
  replacements, social whims, behavior flags.
- **UI:** tabbed layout mirroring the V5 field groups.
- **Avalonia:** `TabControl` with per-tab ViewModels.

### Live Preview System
- **Feature:** in-app previews of game-style surfaces — notification popups,
  CAS cards, 11 notification templates across Careers/Traits/Aspirations;
  project-scoped custom notification templates can be added.
- **UI:** resizable split pane (editor left, preview right).
- **Data:** `src/components/mc/preview/*`.
- **Avalonia:** `GridSplitter` split view; preview cards as styled `Border`s.

### Assets, Icons & Exporter
- **Feature:** project-scoped Asset Manager with renameable folder tree
  (full CRUD) and tagging; built-in library of 215 original icons with a
  painterly renderer; icon picker (Library / Assets / Upload) wired into every
  image field; Package Exporter bundles mixed item types (careers, traits,
  etc.) from the active project into one package with per-type folders.
- **Data:** `src/lib/icon-library.ts`, `icons/IconArt.tsx`, `ImageField.tsx`,
  `views/AssetManager.tsx`, exporter view.
- **Avalonia:** folder tree = `TreeDataGrid` with rename-in-place; icon picker
  = modal `Window` with a virtualized grid; icon art rendered via Skia paths.

### Productivity systems
- **Feature:** Command Palette (Ctrl/Cmd+K), universal search, Notification
  Center, undo/redo field history, Property Inspector (validation + field
  locking), Templates Gallery with user-saved templates, Snippets Library,
  Dependency Graph, Validation Center with auto-fixes, Reference Viewer (V5
  field docs), Activity Timeline, Build Analytics, Update Center (lot51),
  Keyboard Shortcuts dialog (Ctrl/Cmd+/), copy rewards/branches/perks/salary
  across branches, sections, and projects.
- **Avalonia:** palette = borderless `Window` with `AutoCompleteBox`; shortcuts
  via `KeyGesture` with `Cmd` on macOS and `Ctrl` on Windows; graph views via
  a Skia-drawn `Control`.

### Templates
- **Feature:** 15 original functional starter templates (fake attributions
  removed); scaffolding creates real project content; users can save their own
  templates, badged "Yours".
- **Data:** `Template` schema in `src/lib/types.ts`, scaffolding in
  `src/lib/store.tsx`.

### Credits & Acknowledgements
- **Feature:** permanent Credits section reachable from Help menu and Settings.
- **Data:** `src/lib/credits.ts`, `CreditsContent.tsx`.
- **Avalonia:** modal `Window` fed from the same credits data file.

### Host integration (app-side only)
- **Feature:** app-host capability detection (dev / desktop), portable
  `.mcbundle.json` import/export, MCP tool surface (18 tools: inspection,
  authoring, bundle roundtrip, templates/snippets).
- **Avalonia:** bundle roundtrip is the interop contract — implement
  import/export first; MCP hosting stays out of the desktop client.

---

## Removals & explicit non-goals for the port
- No EA branding or copied EA assets anywhere in the app.
- No public marketing pages, landing route, or preview-unlock route in the
  desktop build — those exist only for the web deployment.
- Demo project must remain deletable; do not special-case protect it.
- Roles/permissions are not part of the desktop app.
