# Mod Constructor V6 — Per-Page App Replica Spec

Companion to `CODEX_AVALONIA_UI_SPEC.md`. This file covers **every page inside the app shell only** (no public landing website). It is the exact-replica reference — layout, tabs, cards, fields, controls, buttons, empty states, toasts, and state bindings — for the Avalonia (macOS + Windows) rebuild.

Source of truth mapping:
- Shell: `src/components/mc/{TopBar,Sidebar,MenuBar,StatusBar,Canvas,CommandPalette,NotificationCenter,ShortcutsDialog,CopyToMenu,CreditsContent,ImageField}.tsx`
- Router: `src/components/mc/Views.tsx` → `SectionView({ active })`
- Dashboard: `src/components/mc/Dashboard.tsx`
- Views: `src/components/mc/views/*.tsx`
- Previews: `src/components/mc/preview/*.tsx`
- Inspector: `src/components/mc/inspector/PropertyField.tsx`
- Icons: `src/components/mc/icons/{IconArt,IconPicker}.tsx`
- State: `src/lib/store.tsx`, contracts: `src/lib/types.ts`
- Tokens: `src/styles.css`
- Section registry: `src/components/mc/sections.ts`

Icons are Lucide throughout — use **Projektanker.Icons.Avalonia.Lucide** and reference the exact glyphs named below.

---

## 0. Global App Chrome (present on every page)

### 0.1 TopBar — height 56 px, sticky, `bg-background/85` blur, bottom hairline `Border`
Left cluster (breadcrumb):
- Muted section label (`SECTION_LABEL[active]`)
- `ChevronRight` 3.5 px muted separator
- Bold active project name
- Green pill `● Building` — 1.5 px dot, `Green` foreground, `Green/10` bg, `Green/30` border, uppercase 11 px "Building".
- Muted pill `<Save/> Autosaved · 12s ago`.

Right cluster (in order):
1. **Advanced-Mode toggle** — 36 px pill button with `Wrench` icon and mini switch. Off state: muted border + "Simple". On: orange `Orange/40` border, `Orange/10` bg, orange text, switch knob slides right. Toggling fires an info toast ("Advanced mode enabled" / "Simple mode") through `useNotifications().push`.
2. **Command palette launcher** — 256 px card-style button: `Search` icon + placeholder "Search or run a command…" + `⌘K` kbd chip. Opens Command Palette.
3. **lot51 sync button** — icon-only pill: `Wifi`/`WifiOff` + `Cloud` + "lot51" label + `RefreshCw` (spins during check). On click pushes a `Contacting lot51.cc…` notification, then after 1.6 s pushes success `Up to date — Lot51 Core Library v1.108.318`.
4. **Notification bell** — square button (36 px); shows an orange 4-px badge with unread count when `unread > 0`; opens the Notification Center flyout.
5. **Help** (`HelpCircle`).
6. **Theme toggle** — `Moon`/`Sun`, `useTheme().toggle`.
7. **User chip** — 24 px gradient (violet→blue) avatar with initials "AK", bold "Alex Kern", 10 px muted "Lead Modder".

### 0.2 Sidebar — width 240 px, left `Sidebar` bg, right border
Header (top 56 px): 32 px rounded square gradient (teal→blue) with `Hammer` icon, then bold "Mod Constructor" and 10 px caption "V6 · Simple/Advanced Mode".

Groups and items (icons in Lucide; some carry badges). Group headers are 9.5 px bold uppercase 0.14em muted. Item row is 36 px, 10 px padding, 6 px radius. Selected: `SidebarAccent` bg, blue icon, 6 px teal glow dot right-aligned. Hover: 60 % accent tint.

- **Workspace**: Dashboard (`LayoutDashboard`), Projects (`FolderKanban`, badge `"12"`), Project Explorer (`FolderTree`), Templates (`LayoutTemplate`), Reference (`BookOpen`).
- **Builders**: Career Builder (`Briefcase`), Trait Builder (`Sparkles`), Aspiration Builder (`Target`), Notification Library (`Bell`), Icon Library (`Image`, badge `"200+"`), Project Assets (`Boxes`), Snippets (`Code2`), Package Exporter (`Package`), Build Queue (`ListChecks`, badge `"2"`).
- **Library**: Community Library (`Globe`, badge `"Beta"`).
- **Insights**: Dependency Graph (`GitBranch`), Activity (`Clock`), Build Analytics (`BarChart3`), Update Center (`Radio`), Settings (`Settings`).
- **Advanced** (visible only when `useAdvanced().advanced === true`, group label prefixed by small orange `Wrench`): Tuning Editor (`Sliders`), Validation Center (`ShieldCheck`, badge `"3"`).

Bottom pinned "Engine Status" card: 12 px margin, bordered; pulsing green dot + "Sims 4 · 1.108.318" + 10 px muted "S4PE bridge · local".

### 0.3 MenuBar (Windows in-window / macOS `NativeMenuBar`)
`src/components/mc/MenuBar.tsx` — File / Edit / View / Build / Help. Every entry maps to a `useAppStore` action or opens a dialog:
- File: New Project, Open Bundle, Import, Save, Save As, Export Bundle, Exit.
- Edit: Undo (⌘Z), Redo (⇧⌘Z), Cut/Copy/Paste, Preferences.
- View: Toggle Sidebar, Toggle Theme, Toggle Advanced Mode.
- Build: Compile Package (⌘B), Validate All, Cancel Build.
- Help: Shortcuts (⌘/), Reference Viewer, Credits, About.

### 0.4 StatusBar — height 28 px, fixed bottom, left-inset 240 px, `bg-card/95`
Chips (10.5 px, `MutedForeground`):
1. Ready · `SECTION_LABEL[active]` (green `Circle` dot).
2. Validation: `0 errors · 3 warnings` (green `ShieldCheck`).
3. Build: `idle` (blue `Package`).
4. Autosaved · Ns ago (teal `Save`) — N tick counter (1 s interval).
5. If Advanced: orange `Wrench Advanced mode`.
Right cluster (`ml-auto`): 0 selected (`MousePointer2`), Provider: `PROVIDER_LABEL[imageProvider]` (violet `Sparkles`), Online/Offline (`Wifi`/`WifiOff`), CPU 4 % (`Cpu`), 428 MB (`HardDrive`), main branch (`GitBranch`), text "Game 1.108.318 · Project v0.8.2". If Advanced: monospace "UTF-8 · LF · XML · Ln 142, Col 18".

### 0.5 Command Palette — modal 640 px wide, centered, ⌘K
`src/components/mc/CommandPalette.tsx`. Fuzzy-filters `command-registry.ts`. Rows: icon + name + accent + right-aligned kbd. Grouped by category (Navigation / Actions / Advanced). ESC / click backdrop closes.

### 0.6 Notification Center — right drawer 380 px
`NotificationCenter.tsx`. List grouped by day. Each item: icon by `kind` (info/success/update/warn), title + 12 px muted description + relative time. "Mark all read" and "Clear" actions.

### 0.7 Shortcuts Dialog — ⌘/ opens
`ShortcutsDialog.tsx`. Two-column table of key combos and descriptions.

### 0.8 Copy-To Menu
`CopyToMenu.tsx`. Contextual `Popover` with tabs: Copy to Branch / Copy to Section / Copy to Project. Each list shows destination + green check on success (toast "Copied to <target>").

### 0.9 ImageField / IconPicker (reused in every builder)
`ImageField.tsx` renders a 64 × 64 preview with hover overlay. Click opens `IconPicker` dialog with three tabs: Library (215 built-in painterly icons from `icon-library.ts` rendered by `IconArt.tsx`), Assets (project images), Upload (file dialog + drop zone).

---

## 1. Dashboard  (`SectionId = "dashboard"`)
Route: root section. 12-column CSS grid, 16 px gutter, 24 px page padding.

### Header row (3 KPI tiles across the top)
`MetricCard` component:
- Build Health — value 92, accent Green, `Activity` icon, sub "+4 % since yesterday".
- Compatibility — 88, Blue, `GitBranch`, "7 mods scanned".
- Package Completeness — 76, Orange, `Package`, "18 assets missing".

Each tile: 20 px title (uppercase 10 px + bold number + tiny sparkline + sub label). Left color bar in accent.

### Row 1
- **Current Project** (col-span 5) — `Dashboard.tsx` `CurrentProject`. Shows cover image, name, version, status pill, quick stats (Careers/Traits/Aspirations/Notifications counts), 4-button toolbar (Rename, Duplicate, Open Detail, Compile). Uses `useStore().state` and `activeProjectId`.
- **Quick Actions** (col-span 4) — `SectionCard "Quick Actions" (Zap, orange)`. Grid of 6 tiles: New Career, New Trait, New Aspiration, New Notification, Import Bundle, Export Bundle. Each is a bordered button (icon in accent + 12 px title + 10 px sub).
- **Build Queue** (col-span 3) — `SectionCard "Build Queue" (Clock, teal, action="Manage")`. Row list: package name + progress bar 0-100 % + status pill (Queued/Running/Failed/Done). Includes simulated build ticking from 65 % → 99 %.

### Row 2
- **Constructor Canvas** (col-span 8, min-height 420 px). Renders `<Canvas/>`. 
  - Frame: `bg-muted/40 dotted-grid` inside 12-radius card.
  - Toolbar left (Advanced): four pill buttons Select / Node / Edge / Group.
  - Simple mode: info tip "Click a card to edit that part of your mod." (blue `Info` icon).
  - Toolbar right: `Layers` icon + status text ("Constructor Canvas · N nodes · M edges" advanced / "Your Mod at a Glance" simple).
  - Nodes: Advanced set (`Career Root → Trait Bundle`, `Aspiration`, `Tuning XML`, `Package`, edges `root→trait/asp`, `trait→tune`, `asp→tune`, `tune→pkg`). Simple set (`Career`, `Traits`, `Aspiration`, `Mod File`; edges through). Each node is 180 × 68 rounded card with left color bar, icon chip, label, sub-label. SVG connections in `Border` color, 2 px thick, curved.
- **Templates** (col-span 4) — `SectionCard "Recent Mod Templates" (Layers3, violet, action="Browse all")`. List of 5 rows: icon chip + name + type badge + updated time.

### Row 3
- **Metadata** (col-span 4) — `SectionCard "Mod Metadata" (FileCode2, orange)`. Fields: Name, Author, Version, Category (Career/Trait/Aspiration), Description textarea. Save button.
- **Live Preview** (col-span 4) — `SectionCard "Live Preview" (Eye, blue, subtitle="Astronaut · Rank 3", action="Pop out")`. Renders a mini Sims-style promotion popup (cover art, rank, salary bump, tiny reward chips). Populated from active career.
- **Validation Results** (col-span 4) — `SectionCard "Validation Results" (CheckCircle2, green, subtitle="4 checks · 1 error", action="Re-run")`. Row list with level icons. Advanced-only.

### Row 4
- **Dependency Checker** (col-span 6) — `SectionCard "Dependency Checker" (GitBranch, blue, subtitle="4 mods scanned", action="Refresh")`. Row per detected mod: name + status (OK / Conflict) + version.
- **Build Log** (col-span 6, Advanced only) — `SectionCard "Build Log" (Terminal, violet, subtitle="Live stream · epic_careers", action="Clear")`. Monospace scrolling console with color-tinted level prefixes.

### Row 5 (Simple mode only)
- **Build Steps** — `SectionCard "Build Steps" (PlayCircle, teal)`. Numbered guided steps 1 → Metadata → Add content → Preview → Compile → Export. Each step becomes green when complete.

Interactions:
- Simulated build ticker updates queue and build log.
- Toasts: "Package built · epic_careers.package" on Compile.
- Metric values re-render when `activeProjectId` changes.

---

## 2. Projects  (`"projects"`)
`ProjectsView` in `Views.tsx`. Page header: `FolderKanban` (blue), subtitle "Workspace", title "Projects", actions `Import Bundle` (Ghost `Upload`) + `New Project` (Primary `Plus`).

Filter bar: search `Input` "Filter projects…" + `Filter` icon secondary + status dropdown (All / Draft / In Progress / Complete / Tested / Released).

Grid: responsive cards (3 across at 1600 px). Each project card contains:
- Cover thumbnail (16 : 9), status pill overlay top-right using `StatusPill` (colors: Draft/orange, In Progress/blue, Complete/green, Tested/teal, Released/violet).
- Title (bold), version chip `v1.2.3` monospace, updated time.
- Row of small icon badges: careers/traits/aspirations/notifications counts.
- Kebab menu (`MoreHorizontal`): Open, Duplicate, Rename, Set Active, Detail, Delete (destructive). Toast on each.

Empty state: 12-radius dashed border card with `FolderKanban` icon, headline "No projects yet", CTA "New Project".

`ProjectDetailDialog` (opened from card): shows metadata, version history / changelog list, status transition buttons (`Mark Complete`, `Mark Tested`, `Mark Released`), version bump form (`version` + `notes` textarea + Save). All wired to `store.setProjectVersion` / `store.setProjectStatus` and adds a changelog entry (author "Alex Kern").

---

## 3. Project Explorer  (`"explorer"`)
`views/ProjectExplorer.tsx`. Two-pane split (left 320 px tree, right detail).

Left pane:
- Toolbar: search "Search projects & items…", `New Project` button.
- Tree derived from `useStore()` state grouped Project → Careers / Traits / Aspirations / Notifications / Assets. Each row is `TreeRow`: chevron, folder icon, name, count badge, kebab menu.
- Selecting a leaf sets local detail context.

Right pane:
- Header with project name, `v` chip, status pill, "Open Project" action (toasts "Opening …").
- Tabs: Overview / Careers / Traits / Aspirations / Assets. Each tab shows a filtered list with quick-open, duplicate, delete actions.
- Empty state when no project selected.

---

## 4. Career Builder  (`"career"`)
`CareerBuilder` in `Views.tsx` (blue accent, `Briefcase`).

### Layout
Page header: subtitle "Builder", title "Career Builder", actions `Copy To…` (`CopyToMenu what="entire career"`), `Save Draft` (Ghost `Save` — toast "Career draft saved"), `Compile` (Primary `Play` — toast "Career compiled → epic_careers.package").

Tab strip below header (buttons, blue underline for active). Advanced-only tabs hidden when not in Advanced.
1. **Identity** (`Briefcase`) — always.
2. **Levels** (`ListChecks`) — always.
3. **WFH Events** (`Calendar`, advanced).
4. **Messages** (`MessageSquare`, advanced).
5. **Advanced** (`Sliders`, advanced).

### Tab: Identity
Two-column grid (7-5).
- Card **Career Identity**: fields Name, Short Description, Long Description (Textarea), Category (Select: Adult/Teen/Elder/Business/STEM/Creative/etc.), Family/Track ID (monospace), Author, Version (monospace).
- Card **Icon & Image**: `ImageField` for icon (64 px), `ImageField` for uniform art (128 px tall).
- Card **Age Availability** (action = help tooltip): checkbox chips Young Adult, Adult, Elder, Teen.
- Card **Paid Time Off**: numeric fields Sick Days, Vacation Days, Family Leave; toggle "Auto-approve requests".

### Tab: Levels
List of rank rows (`RankRow`) with drag handle (`GripVertical`):
- Row header: Level # chip, name input, salary (Sim §) numeric, promotion score numeric, uniform tile.
- Expand → sub-cards: Work Schedule (Start `Time`, End `Time`, weekday chips M-Su), Objectives (repeater with description + points), Uniform (`ImageField`), Salary curve preview.
- Row footer: `Add Rank` (toast "Added rank N"), Reorder, Delete.
Branches row appears at the bottom: **Add Branch** (toast "New branch scaffolded"). Each branch is a nested card with sub-rank list mirroring the same structure. `Copy To…` menu per branch.

### Tab: WFH Events (advanced)
`EventEditor` list — each event row: Trigger (dropdown), Interval (min), Description text, Outcome buffs, Skill gain, Loot references. Add Event, Duplicate, Delete.

### Tab: Messages (advanced)
Card "Message Overrides". Table of 19 game message keys (Promotion, Demotion, Retirement, Vacation Approved, Sick Day, Overtime, Bonus, Fired, First Day, WFH Success/Fail, Career Change, Rank Up, Rank Down, Missed Work, Assignment Complete, Skill Milestone, Family Emergency, Retirement Party). Each row: key label + monospace text input placeholder `Default: <key> message text…`.

### Tab: Advanced
- Card **Availability Conditions**: repeater of trait/season/holiday requirements.
- Card **Performance Statistic**: skill/relationship weight sliders.
- Card **XML Output**: read-only monospace viewer + Copy button (toast "XML copied").

### Preview side-panel (right)
`PreviewSplit` from `preview/PreviewShell.tsx` wraps editor + `<CareerPreview data={…}/>` when the split-pane is expanded. `CareerPreview` renders promotion notifications, salary graphs, and rank card.

---

## 5. Trait Builder  (`"trait"`)
`TraitBuilder` (violet accent, `Sparkles`). Same header pattern with `Save Draft`/`Compile` (`… → lucid_dreamer.package`). Tabs:
1. Identity (`Sparkles`)
2. Buffs & Moodlets (`Bell`)
3. Behavior (`Zap`) — internal id `special` advanced
4. Aging & Voice — internal id `modifiers` advanced
5. Social & Whims (`Users`, advanced)
6. Advanced (`FileCode2`, advanced)

### Tab: Identity
- Card **Trait Identity**: Name, Short/Long Description, Category (Personality/Gameplay/Reward/Bonus), Conflict Set ID, Tuning ID.
- Card **Icon**: `ImageField`.
- Card **Available For (Ages)**: chips Baby/Toddler/Child/Teen/YA/Adult/Elder + gender-neutral checkbox.

### Tab: Buffs & Moodlets
List of 15 preset emotional buff models (Happy/Confident/Focused/Playful/Flirty/Energized/Inspired/Angry/Sad/Tense/Bored/Uncomfortable/Embarrassed/Dazed/Custom). Each row: enabled toggle, name, mood level (-3..+3), duration (h), decay curve dropdown, buff icon `ImageField`, description textarea.

### Tab: Behavior (advanced, internal `special`)
- Card **Behavior Flags**: toggles Autonomous, Weighted Autonomy, Hidden, Reward, Career-Locked, Aspiration-Locked, etc.
- Card **Aging & Voice**: Voice Effect dropdown (Normal/Pitched/Alien/Robot/etc.), Aging Block toggle, Auto-remove on age up.
- Card **Blocked Emotions**: chip picker for buff labels.

### Tab: Aging & Voice (advanced, internal `modifiers`)
- Card **Autonomy Commodities**: numeric weights for commodities (Bladder, Fun, Social, Hunger, Hygiene, Energy).

### Tab: Social & Whims (advanced)
- Card **Whim Set**: dropdown of whim sets + preview list.
- Card **Social Interactions**: table Original → Replacement.
- Card **Buff Replacements**: repeater (`Original buff` → `Replacement buff`, blocked toggle).
- Card **Proximity Buffs**: chip list "Buff reference".
- Card **Setup Actions (Loot on Trait Add)**: repeater of loot action ids.
- Card **Conflicting Traits (Blacklist)**: chip picker.
- Card **Required Traits (Whitelist)**: chip picker.

### Tab: Advanced
- Card **XML Manifest Preview**: monospace viewer + Copy (toast "XML copied").

Right side preview: `<TraitPreview/>` renders CAS trait card + sample moodlet popups.

---

## 6. Aspiration Builder  (`"aspiration"`)
`AspirationBuilder` (teal accent, `Target`). Two cards + tier repeater:
- Card **Aspiration**: Name, Track (dropdown Family/Nature/Wealth/Knowledge/Love/Fortune/Deviance/Creativity/Athletic/Food), Category, Age Availability chips, Description, Icon (`ImageField`).
- Card **Tiers** (action `CopyToMenu what="all tiers & rewards" disallowBranches`): repeater. Each tier: Title, Description, Milestones list (checkbox + text + skill/count target). Add Tier, Reorder, Delete.
- Card **Reward**: reward name, trait grant dropdown, buff reference, description.

Right pane preview: `<AspirationPreview/>` renders aspiration selection card + milestone tracker overlay.

---

## 7. Notification Library  (`"notifications"`)
`NotificationLibrary` in `preview/NotificationLibrary.tsx` (orange accent, `Bell`).

Header: subtitle "Library", title "Notification Library". Actions: `New Template` (opens dialog).

Left column (320 px): search + grouped list of 11 built-in templates + user templates (`Yours` badge). Grouping: Careers / Traits / Aspirations / Misc.

Right column: live preview stage (`GameUI`) showing a rendered popup with:
- Rounded 16-radius card, 4-stop gradient header per `previewKind` (blue, violet, teal, orange).
- Icon chip, headline, body text, primary/secondary buttons.
- Right-side property panel: Kind dropdown, Title input, Body Textarea, Icon `ImageField`, Timeout numeric (s), Toast style (top-right/center/bottom), Buttons repeater (label + variant).

Interactions: Save Template → `store.addNotification`; toast success/fail. Delete user template with confirm.

---

## 8. Icon Library  (`"icons"`)
`views/IconLibraryView.tsx` (blue accent, `Image`).

Header: subtitle "Assets", title "Icon Library", action `New Collection` (creates project-scoped collection, toast "Created collection · <name>").

Layout: 3-column split.
- Left 240 px: search "Search icons…", filter categories (Career / Trait / Aspiration / Buff / Skill / Object / Emotion / Symbol), tag chips.
- Center: virtualized grid of 215 icons rendered by `IconArt.tsx` (painterly SVG). Each tile: 72 px square, name below, hover highlight. Selection outlines with `Blue`.
- Right 320 px: selected icon detail card — big painterly preview, name, category, tags, palette swatches, `MetaRow` list (size, license, author = "Built-in"). Buttons: `Add to Project Assets` (toast "Copied … to Project Assets"), `Quick Assign` submenu (Career Icon / Trait Icon / Aspiration Icon / Notification Icon → toast).

---

## 9. Project Assets  (`"assets"`)
`views/AssetManager.tsx` (green accent, `Boxes`).

Header: subtitle "Project", title "Project Assets", actions: `New Folder` (`FolderPlus`), `Import` (`Upload`).

Layout: split
- Left 260 px: folder `TreeView`. Root = project name. `FolderRow` per folder: icon (`FolderOpen`/`Folder`), name, count. Kebab: Rename (inline), Empty (toast "Folder emptied"), Delete.
- Right: toolbar (search "Search filenames & tags…", sort dropdown, view toggle Grid/List) + `AssetTile` grid. Each tile: thumbnail (image or file-type icon), name, size, tag chips. Selected outline. Context menu: Move to folder…, Rename, Duplicate (toast "Duplicated"), Delete, Copy path.

Empty state: dashed card "Drop files here or click Import".

---

## 10. Reference Viewer  (`"reference"`)
`views/ReferenceViewer.tsx` (blue accent, `BookOpen`).

Header: subtitle "Docs", title "Reference Viewer". Search + category filter. Content is a static schema library of V5 fields (Career, Trait, Aspiration, Notification, Loot, Buff, Tests).

Layout: left 300 px topic list, right detail. Detail includes:
- Title, one-line summary, badges (Category, Required/Optional).
- Fields table: name (monospace), type, description. Each field has a `Copy` button (toast "Copied").
- "See also" cross-links.
- Bookmark toggle (toast "Bookmarked").

---

## 11. Package Exporter  (`"exporter"`)
`ExporterView`. Reads active project from store. Two-column layout `1fr 320 px`.

Header: `Package` (violet), subtitle "Pipeline". Actions: `Preview Manifest` (ghost), `Build Package` (primary; label switches to "Building…", 1.6 s simulation, toast success).

Project banner strip: "Exporting from project <name> v<ver>" + Demo badge if applicable + "N items · M assets".

Left column card **Contents**:
- Toolbar action row: "N selected", "Select all", "Clear".
- Sub-grouped lists per kind: Careers / Traits / Aspirations / Notifications. Each shows counts `x/y`.
- Row: checkbox + color bar (kind color) + name bold + version monospace + kind badge pill.
- Empty state (no items): dashed border block "This project has no careers, traits, aspirations, or notifications yet."

Right column stack of small cards:
- **Package Info**: Package Name, Creator, Version fields.
- **Bundle Mode**: radio cards "Single .package" vs "One per item".
- **Options**: checkbox "Include linked assets & strings" + right-aligned "N in project".
- **Output**: monospace preview showing 📦 filename(s) that will be produced.

---

## 12. Validation Center  (`"validation"`, advanced)
`views/ValidationCenter.tsx` (green accent, `ShieldCheck`).

Header actions: `Run All Checks` (primary `Play`, spinner "Running…", toast "Validation complete · 1 error, 2 warnings").

Cards:
- **Summary** — three chips (Errors red, Warnings orange, Passed green) + trend sparkline.
- **Latest Results** (5 checks): rows w/ level icon (`CheckCircle2` green / `AlertTriangle` orange / `XCircle` red), message, source path monospace, quick fix button when auto-fix is available.
- **Rulebook**: toggles for each rule set (IDs, Manifest, Schema, References, Assets, Strings) with severity dropdown.
- **History**: table of previous runs with timestamp and score.

There is also a legacy `ValidationView` shown from the Advanced-only sidebar (`Validation Center`); it uses the same 5-item fixture list (Tuning IDs, Manifest schema, Missing STBL, Icon dims, Broken ref).

---

## 13. Build Queue  (`"queue"`)
`QueueView` in `Views.tsx` (teal accent, `Clock`). Table of queued/running/finished builds.

Columns: Package, Kind (Career/Trait/…), Progress bar %, Status pill (Queued/Running/Failed/Complete), Duration, Started at, Actions (Pause/Resume/Cancel/Retry — icons `Pause`, `Play`, `XCircle`).

Toolbar: "Clear complete", "Pause all", filter dropdown by status.

---

## 14. Templates  (`"templates"`)
`views/TemplatesGallery.tsx` (violet accent, `LayoutTemplate`).

Header actions: `New Template` (opens dialog).
Filter row: search "Search templates…" + category chips (Career / Trait / Aspiration / Notification / Starter / Yours).

Grid: template cards — cover art, badge (Built-in or `Yours`), title, one-line desc, count of contents. Buttons: `Use in Project` (scaffolds via `store` — toast e.g. "Added career "…" to project"; error toasts on missing project or empty template), `Preview`, `Duplicate`, `Delete` (only for user templates).

New Template dialog fields:
- Template name (required, error toast "Template name is required" when empty).
- Description textarea.
- Kind (Career/Trait/Aspiration/Notification).
- Source project (dropdown, defaults to active project).
- Content selection (checkboxes per item).
Save → persist to `localStorage` and refresh gallery (toast "Saved template …").

---

## 15. Snippets  (`"snippets"`)
`views/SnippetsLibrary.tsx` (blue accent, `Code2`).

Header actions: `New Snippet` (toast "Snippet created").

Layout: left list "Search snippets…" + category filter (XML/Loot/Buff/Test/Message). Right detail: title, tags, monospace body, `Copy` button (toast "Copied to clipboard"), `Insert into active builder` (context-aware).

---

## 16. Dependency Graph  (`"graph"`)
`views/DependencyGraph.tsx` (blue accent, `GitBranch`).

Header + toolbar (zoom, fit, layout dropdown Force/Hierarchy/Radial).
Main canvas: interactive node graph derived from `store` (careers, traits, aspirations, assets). Nodes coloured by kind; edges: `uses`, `requires`, `conflicts`. Legend chip row at bottom. Right side inspector panel for selected node with meta and outgoing/incoming lists.

Recommended Avalonia library: **NodeNetwork**.

---

## 17. Activity Timeline  (`"timeline"`)
`views/ActivityTimeline.tsx` (teal accent, `Clock`).

Two-column timeline grouped by day. Each entry: avatar/action icon + description ("Renamed rank 2 → Cadet") + relative time + optional diff. `Revert to this point` link on major snapshots (toast "Reverted to this point"). Filter dropdown by kind (Edit/Compile/Import/Export/Status).

---

## 18. Build Analytics  (`"analytics"`)
`views/BuildAnalytics.tsx` (blue accent, `BarChart3`).

Header + KPI row (`Kpi`): Builds this week (# + delta), Success rate (%), Avg build time (s), Failures.
- **Builds by day**: bar chart (LiveChartsCore).
- **Module completeness**: horizontal progress bars per module (Career, Trait, Aspiration, Notification, Assets).
- **Recent builds**: table of runs (Time, Package, Kind, Duration, Status, Log link).

---

## 19. Update Center  (`"updates"`)
`views/UpdateCenter.tsx` (teal accent, `Radio`).

Header actions: `Check Now` (spinner, toast "You're on the latest metadata"). Three status cards (`StatusCard`):
- Sync mode — "Auto (daily)" / "Manual".
- Available — "N updates" (orange) or "You're current" (green).
- Last check — "2 min ago" (blue).

Card **Sources**: header + checkbox "Auto-check daily". Rows per feed (`Lot 51 Core` / `Zerbu Legacy` / `Community`):
- Left: channel name + status pill (Update orange / Current green), then meta line `Available <ver> · Installed <ver> · Released <date>`, description line.
- Right actions: `Install` (blue primary) or `Up to date` chip + external `Notes` link (`ExternalLink`) to `https://lot51.cc`.

---

## 20. Community Library  (`"community"`, marked "Beta")
`views/CommunityLibrary.tsx` (violet accent, `Globe`).

Header: title "Community Library" + Beta pill + `BetaNotice` panel about free-tier limits.

If backend unavailable: `NotConfiguredCard` — dashed card, headline "Community service not configured", body text with steps.

Otherwise Tab bar: **Browse / My uploads / Upload / Admin** (Admin only when `showAdmin`).

- **Browse**: search "Search approved uploads", filter chips (Career/Trait/Aspiration/Notification/Snippet), sort dropdown. Grid of `ItemCard`s with cover, title, uploader, size, downloads, `StatusPill` (Approved/Pending/Rejected). Actions: `Import into local library` (toast success/error), `Report`.
- **My uploads**: list of user submissions with moderation status, `Withdraw`, `Edit`, download counts.
- **Upload**: form fields Name ("e.g. Detective Career"), Description textarea, Tags input ("e.g. sci-fi, active, adult"), Kind dropdown, File picker (JSON only, ≤ 2 MB, preview ≤ 500 KB), Preview image (compressed to WebP browser-side). Validation errors shown inline. Submit → toast (success or error message).
- **Admin**: toggle "Uploads enabled/paused" (toasts "Uploads enabled." / "Uploads paused."), Notice textarea (e.g. free-tier warning), Moderation queue with Approve / Reject buttons (toast "Marked <status>").

---

## 21. Tuning Editor  (`"tuning"`, advanced)
`TuningEditor` in `Views.tsx` (orange accent, `Sliders`). Three-column layout.

- Card **Files** (col-span 3): folder tree of tuning XML files inside the active project. Row = filename monospace + status dot.
- Card **`career_astro.xml`** (col-span 9): Monaco-like code viewer with line numbers, syntax highlighting for XML, breadcrumb, and toolbar (Save, Reload, Validate, Format).
- Bottom drawer: Validation log for the current file.

Use **AvaloniaEdit** for the code viewer.

---

## 22. Settings  (`"settings"`)
`SettingsView` (violet accent, `Settings`).

Sections stacked vertically:

### Runtime Host card
Two tiles side by side:
- **ChatGPT App mode** (green outline when active): "Runs embedded inside ChatGPT via the OpenAI Apps SDK."
- **Desktop mode** (blue outline when active): "Standalone Windows/macOS build."
Footer note about `.mcbundle.json` interop.

### Engine Capabilities card
Table of engine capabilities with state chips (`Available`, `Simulated`, `Unavailable`) from `engine-capabilities.ts`; tooltips per row.

### Image Generation Provider card
Grid of provider tiles from `useAppHost().availableImageProviders` plus a disabled `ChatGPT — Coming later` tile (orange badge). Active tile: blue outline + blue tint. Selecting → toast "Provider · <label>".

### MCP Tools card (visible only when host is ChatGPT)
Table of 18 tools from `MCP_TOOL_DEFS` — name, category (Inspection / Authoring / Bundle / Templates), description.

### Demo Data card
Buttons `Reset to demo`, `Clear all projects` (destructive confirm).

### Interface Mode card
Two large radio cards Simple / Advanced — same styling as onboarding tiles. Bound to `useAdvanced()`.

### Two-column grid:
- **Sims 4 Installation** (col-span 6, action `OsBadge` chip macOS/Windows): `InstallPaths` component. One `PathField` per known path (Mods folder, User data, Program install). Each row: label, monospace path input, `Browse…` (opens `IStorageProvider`), status pill (Found / Not found).
  - macOS defaults: `~/Library/Application Support/The Sims 4/`, `~/Documents/Electronic Arts/The Sims 4/`.
  - Windows defaults: `%USERPROFILE%\Documents\Electronic Arts\The Sims 4\`, `C:\Program Files (x86)\Origin Games\The Sims 4\`.
- **lot51.cc Sync** (col-span 6): paragraph, four `SettingToggle` rows — "Check for updates at launch" (default on), "Notify me about new templates" (default on), "Auto-download minor patches", "Share anonymous crash reports". Bottom row: `Check Now` (ghost `Download`, toast "lot51 Core Library up to date") + "Last checked · 2 days ago".
- **Editor** (col-span 6): toggles "Autosave every 30s" (on), "Confirm before compiling" (on); Advanced-only toggles: "Enable node canvas snapping" (on), "Show hex IDs", "Validate on save" (on). Advanced-off message: "More editor toggles appear when Advanced mode is on."
- **About** (col-span 6): `Row` list — Application "Mod Constructor V6", Version "6.0.0", Author "neshadenise", Host (Desktop / ChatGPT App), Platforms "Windows · macOS", License "Personal · Non-commercial", Advanced: Framework ".NET 8 · Tauri (planned)". Below divider: "Credits & Acknowledgements" heading + `<CreditsContent showInternal={advanced}/>` (renders full credits list — libraries, community thanks, contributors — from `credits.ts`).

---

## 23. Cross-Cutting Details

### Toast System
Sonner-style; port to Avalonia via `NotificationManager` in the corner. Levels: `default`, `success` (green), `error` (red), `info` (blue). Auto-dismiss 4 s; hover pauses; stacked bottom-right. Exact copy is listed under each page above.

### PropertyField semantics (all builders)
`src/components/mc/inspector/PropertyField.tsx`:
- Label: 10 px uppercase muted with 0.14em tracking.
- Optional `Locked` chip (padlock).
- Control zone: input/textarea/select/toggle/color/path/image field.
- Validation slot below (red text w/ `AlertTriangle`).
- History dot (blue) when the field was recently edited (`useInspectorHistory().recentFieldIds`).
- Help tooltip trigger (`?`) on the right — opens a small `Popover` with reference text.

### StatusPill palette
| Status | Color token |
|---|---|
| Draft | Orange |
| In Progress | Blue |
| Complete | Green |
| Tested | Teal |
| Released | Violet |
| Archived | Muted |

### Kind palette (used in Exporter, Explorer, Templates, Analytics)
Career → Blue, Trait → Violet, Aspiration → Teal, Notification → Orange, Snippet → Green, Asset → Muted-foreground.

### Advanced-Mode gate
Everywhere `useAdvanced().advanced` is checked: hide Advanced sidebar group; hide Advanced builder tabs; hide XML/Manifest/Tuning/Validation cards; hide `Show hex IDs` and other engineer toggles. In Avalonia, expose as `AppSettings.AdvancedMode` and bind `IsVisible` via a `BoolToVisibilityConverter`.

### Persistence
- `useStore` mirrors to `StorageAdapter` (`storage-adapter.ts`). Avalonia default = `JsonFileAdapter` writing to platform app-data directory. Additional drivers: `InMemoryAdapter` (tests), `BundleAdapter` for `.mcbundle.json` import/export.
- Every mutating action is listed in `UI_ACTION_INTEGRATION_MAP.md`; Avalonia views must call the same store methods and never keep divergent local state (aside from transient text-input drafts).

### Bundle format
`ProjectBundle` v2 (see `src/lib/types.ts`). Byte-identical round-trip is required so a project exported from web/ChatGPT opens in the desktop build unchanged.

### Keyboard shortcuts (mirror `ShortcutsDialog.tsx`)
- ⌘K / Ctrl+K — Command Palette
- ⌘/ / Ctrl+/ — Shortcuts dialog
- ⌘S — Save draft
- ⌘B — Compile
- ⌘Z / ⇧⌘Z — Undo/Redo
- ⌘N — New Project
- ⌘, — Settings
- ⌘1..9 — Jump to sidebar section by index

---

## 24. Fidelity Checklist (per page)

Before marking a page complete in Avalonia:
1. All cards and tabs listed above exist in the exact order.
2. All field labels match verbatim (spelling + casing).
3. Every action mutates `IAppStore` and produces the toast copy documented.
4. Advanced-only cards / tabs disappear when Advanced Mode is off.
5. Colors match the Kind/Status palette from §23.
6. `PropertyField` semantics (label, lock, validation slot, history dot, help) are honored on every editor field.
7. Empty states show the documented dashed-border cards and copy.
8. Bundle round-trip (`.mcbundle.json`) is byte-identical to the web build.

_Source of truth for any ambiguity: read the referenced `.tsx` file. All layout numbers (px, columns, tab order, toast text) were extracted directly from the current implementation and must be preserved._
