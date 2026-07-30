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

### Right sidebar is now a true in-game preview
- The rail no longer shows a field/data readout. It renders the actual game-skin
  cards from `src/components/mc/preview/GameUI.tsx` (CareerCard, PromotionWindow,
  BranchWindow, TraitCard, BuffCard, AspirationCard, NotificationPopup,
  TooltipPreview, IconFrame) scaled into 320px via a `GameSurface` wrapper
  (460px design width, CSS transform scale, ResizeObserver-measured height).
- Per-section scene chips: Career (Panel / Promotion / Branches / Notification),
  Trait (CAS Card / Moodlet / Tooltip / Notification), Aspiration (Panel /
  Milestone / Tooltip), Notification (Popup / Compact), Asset, Project summary.
- Header controls: replay (remount), in-game light/dark skin toggle (independent
  of app theme), collapse.
- **Avalonia:** host a `Viewbox` (Stretch=Uniform) around the game-card
  `UserControl`s; skin toggle swaps a ResourceDictionary, scene chips are a
  `RadioButton` ItemsControl bound to a SelectedScene enum.

### Dashboard slimmed — metrics moved to their related pages
- **Removed from Dashboard:** the Build Health, Compatibility, and Package
  Completeness metric cards, and the Live Preview card in the right column.
- **New homes:** Build Health -> Validation Center, Compatibility -> Dependency
  Graph, Package Completeness -> Package Exporter. All three render the shared
  `MetricTile` from `src/components/mc/HealthMetrics.tsx`, which exposes
  `useProjectHealth()` over `computeHealth()` so every surface reads one source.
- **Left sidebar:** new "Project Health" rail above Engine Status with three
  compact percentage bars; each row navigates to the page that now owns that
  metric (validation / graph / exporter).
- **Avalonia:** one `ProjectHealthService` with observable BuildHealth /
  Compatibility / Completeness; the tile is a reusable `UserControl` bound to it,
  the sidebar rail a `ItemsControl` of `ProgressBar` + `Button` rows.

### Live Preview promoted to a global right sidebar
- **Feature:** a persistent 320px right sidebar rendered by the shell on every
  page. Its content follows the active section: Career/Trait/Aspiration/
  Notification/Asset previews on those builders, and a project snapshot
  (record counts, errors, warnings) everywhere else. A record picker appears
  when the active project has more than one item of the section's kind, plus an
  "Open <kind> Builder" jump.
- **UI:** collapsible via the header button; when collapsed a vertical
  "Live Preview" tab pins to the right edge. Open/closed state persists in
  `mc.preview.panel`. The shell publishes `--preview-w` so the menu bar, content
  column, and status bar all inset by the panel width.
- **Files:** `src/components/mc/PreviewSidebar.tsx`,
  `src/components/mc/HealthMetrics.tsx`; shell wiring in `src/routes/index.tsx`.
- **Avalonia:** use a `SplitView`/`Grid` third column with a `ContentControl`
  whose `DataTemplates` key off the active section id; persist the open flag in
  app settings and bind the other regions' margins to the same width value.

### Window tabs — multi-section switching
- **Feature:** sections now open as tabs instead of replacing the view. Clicking a
  sidebar item, command-palette result, or any in-app jump opens (or focuses) a
  tab. Tabs persist across restarts, can be reordered by drag, closed with the X
  or middle-click, and right-click gives Close tab / Close others / Close all.
  Dashboard is pinned and cannot be closed. Shortcuts: Ctrl/Cmd+Tab and
  Shift+Ctrl/Cmd+Tab cycle, Ctrl/Cmd+W closes, Ctrl/Cmd+1..9 jump. Tabs for
  advanced-only sections close automatically when Advanced mode is turned off.
- **UI:** 36px tab strip between the top bar and content, sticky under the top
  bar, teal top-edge indicator on the active tab, horizontal overflow scroll,
  right-side "N open · Ctrl+Tab" hint.
- **Data:** `src/lib/tabs.tsx` (`TabsProvider`/`useTabs`, persisted to
  `mc.tabs.v1`), `src/components/mc/TabStrip.tsx`. `AppNavigationProvider` now
  receives the tab manager's active/open pair, so every existing navigate call
  opens a tab with no call-site changes.
- **Avalonia:** `TabControl` with a custom `ItemsPanel` (`ScrollViewer` +
  `StackPanel`) and a `DataTemplate` per tab header; bind to
  `ObservableCollection<WorkTabViewModel>` and `SelectedItem`. Use
  `KeyBinding`s for Ctrl+W / Ctrl+Tab / Ctrl+1..9 and a `ContextFlyout` for the
  close commands. Persist tab state to the same app-settings store.

### Accounts — optional sign-in, project ownership
- **Feature:** the app is fully usable signed out ("Guest" / offline). Signing in
  creates an account that owns projects: `Project.ownerId` is stamped on create,
  and any existing device-local projects are attached to the account at sign-in.
  Signing out keeps everything working offline. Cloud sync is behind a single
  `SYNC_CONFIGURED` flag (false in this build) so the UI states the honest
  limitation: without sign-in/sync a build cannot be continued from another
  machine.
- **UI:** account button replaced the hardcoded user chip in the top bar —
  avatar with initials (or guest glyph), name, and a cloud/cloud-off sync line.
  The dropdown shows the guest explainer + "Sign in to attach projects", an
  inline email/display-name form noting how many local projects will be
  attached, or the signed-in account with sync status and Sign out.
- **Data:** `src/lib/account.tsx` (`AccountProvider`/`useAccount`, persisted to
  `mc.account.v1`, `SYNC_CONFIGURED`, `SYNC_LABEL`),
  `src/components/mc/AccountMenu.tsx`, new optional `ownerId` on `Project`.
- **Avalonia:** port the account context as an `IAccountService` singleton with
  `CurrentAccount` and `SyncState`; the menu is a `Button` + `Flyout`. Keep
  `SYNC_CONFIGURED` as a build/config switch so the desktop build can enable a
  real sync backend without UI changes. Store account records in the OS-secure
  settings location, never alongside project files.

### Dashboard — fully live, driven by the active project
- **Feature:** the dashboard no longer shows canned numbers. Every panel reads
  the selected project from the store. Health/compatibility/completeness are
  computed from real records; validation runs a real rule set (duplicate
  internal IDs, empty branches/levels, §0 salaries, missing work days, broken
  icon references, buffless traits, milestone-less aspirations, missing
  description/author); the dependency checker derives requirements from the
  project's own content (XML Injector need, icon coverage, STBL string count,
  required packs). Builds are real queue jobs advanced by a simulated engine
  that streams log lines, progresses through six named steps, completes, and
  pushes a notification. Import loads a `.mcbundle.json`; New Mod creates and
  activates a project; Quick Actions create real career/trait/aspiration
  records, queue a compile, or run validation into the Validation Center;
  Recent Templates scaffolds from actual stored templates; Mod Metadata edits
  write straight back to the project (name, version, author, description,
  tags). Top bar and status bar now report the live project, version, build
  progress, and validation counts.
- **UI:** unchanged layout and density. Added empty states to every panel
  ("Select a project…", "All checks passed.", "Nothing queued."), clickable
  record-count tiles that jump to their builder, per-job cancel/retry buttons
  in the queue, an overflow link into the Validation Center, and a live
  preview that renders the project's first career (or trait) instead of a
  fixed sample.
- **Data:** new `src/lib/project-analysis.ts` (pure `scopeProject`,
  `analyzeProject`, `computeHealth`, `computeDependencies`, `BUILD_STEPS`,
  `stepStateFor`) and `src/lib/build-engine.ts` (`useBuildEngine` ticker over
  `BuildJob`). `Dashboard.tsx`, `TopBar.tsx`, and `StatusBar.tsx` rewired to
  the store; no new state containers.
- **Avalonia:** port `project-analysis.ts` verbatim as a stateless
  `ProjectAnalysisService` (pure C#, unit-testable) and bind panels to a
  `DashboardViewModel` exposing `ObservableCollection<ValidationIssue>`,
  `HealthMetrics`, and `BuildJob`. Replace the ticker with the real build
  process reporting `IProgress<BuildProgress>` on the UI thread; keep the same
  six step names so the step list is identical. Metric cards = `ProgressBar`
  + `TextBlock`; build ring = a Skia-drawn arc control; log = virtualized
  `ItemsControl` with a monospace `TextBlock` per line.


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
