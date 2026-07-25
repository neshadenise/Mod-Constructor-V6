# Mod Constructor V6 — Avalonia (macOS) UI Replication Spec

Target: **Avalonia 11+ (.NET 8)**, macOS-first, cross-platform (Windows also supported).
Purpose: Give Codex everything needed to rebuild the current web UI as a native Avalonia desktop app while preserving layout, tokens, sections, and interactions.

Companion documents already in the repo:
- `CODEX_HANDOFF.md` — high-level architecture and data flow.
- `UI_ACTION_INTEGRATION_MAP.md` — every UI action → store method mapping.
- `src/lib/types.ts` — canonical data contracts (mirror as C# records).
- `src/lib/store.tsx` — reference implementation of the state store.

---

## 1. App Shell

Fixed 1600×900 minimum working canvas, resizable. Three regions:

```text
┌───────────────────────────── TopBar (h=48) ─────────────────────────────┐
│  logo · project switcher · search · sync status · theme · notifications │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Sidebar   │                        Canvas / View                       │
│  (w=240)   │                                                            │
│            │                                                            │
├────────────┴────────────────────────────────────────────────────────────┤
│                        StatusBar (h=28)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

Menu bar on macOS: use native `NativeMenuBar` (File / Edit / View / Build / Help). On Windows, use in-window `MenuBar`. Content mirrors `src/components/mc/MenuBar.tsx`.

Window chrome: use `ExtendClientAreaToDecorationsHint="True"` on macOS with traffic lights; keep custom TopBar below.

---

## 2. Design Tokens

Convert OKLCH values from `src/styles.css` to Avalonia resource dictionaries. Provide **Light** and **Dark** `ResourceInclude`s and switch via `Application.Current.RequestedThemeVariant`.

### Semantic color tokens (map 1:1)

| Token | Light (OKLCH) | Dark (OKLCH) | Usage |
|---|---|---|---|
| `Background` | 0.99 0.003 240 | 0.16 0.03 260 | Window background |
| `Foreground` | 0.18 0.03 250 | 0.95 0.01 240 | Primary text |
| `Card` | 1 0 0 | 0.21 0.035 260 | Panel surfaces |
| `Primary` | 0.55 0.13 220 | same | Accents, focus ring |
| `Muted` | 0.96 0.008 240 | — | Subtle backgrounds |
| `MutedForeground` | 0.5 0.02 250 | — | Secondary text |
| `Border` | 0.92 0.01 240 | — | Dividers |
| `Sidebar` | 0.985 0.004 240 | — | Left rail |
| `SidebarAccent` | 0.94 0.015 240 | — | Selected nav item |
| `Teal` | 0.7 0.12 190 | — | Active pulse dot |
| `Blue` | 0.62 0.16 250 | — | Primary icon accent |
| `Green` | 0.72 0.15 155 | — | Success / engine online |
| `Orange` | 0.72 0.17 55 | — | Advanced-mode marker |
| `Violet` | 0.62 0.19 300 | — | Traits |
| `Red/Destructive` | 0.6 0.22 27 | — | Errors |
| `Yellow` | 0.82 0.14 90 | — | Warnings |

Avalonia does not parse OKLCH natively — precompute to sRGB hex once and store in XAML. A helper table is fine; do not compute at runtime.

### Radius / spacing / typography

- Base radius: **12 px** (`Radius=12`). Variants: 8, 10, 12, 16, 20.
- Font: **Inter** (sans, embed `.ttf` in `Assets/Fonts/`), **JetBrains Mono** for code/IDs.
- Font sizes: 10 (labels), 11 (badges), 12 (secondary), 13 (body), 14 (buttons), 16 (H3), 20 (H2), 24 (H1).
- Line height 1.4; letter-spacing 0 except uppercase mini-labels (0.14em, 9.5px, bold).
- Shadows: subtle 1-layer for cards `0 1px 3px rgba(0,0,0,0.06)`; elevated dialogs `0 10px 30px rgba(0,0,0,0.12)`.

---

## 3. Sidebar (Navigation Rail)

Reference: `src/components/mc/Sidebar.tsx` (source of truth for order/icons/labels/groups).

Width **240 px**, full height, `Sidebar` background, right border. Sections in order:

**Workspace**: Dashboard, Projects (badge "12"), Project Explorer, Templates, Reference.
**Builders**: Career Builder, Trait Builder, Aspiration Builder, Notification Library, Icon Library (badge "200+"), Project Assets, Snippets, Package Exporter, Build Queue (badge "2").
**Library**: Community Library (badge "Beta").
**Insights**: Dependency Graph, Activity, Build Analytics, Update Center, Settings.
**Advanced** (only when `AdvancedMode == true`): Tuning Editor, Validation Center (badge "3").

Group headers: 9.5px bold uppercase, 0.14em tracking, muted; Advanced group prefixed with a small wrench icon in orange.

Nav item row: 36 px tall, 10 px horizontal padding, 10 px gap, 6 px radius. Selected state: `SidebarAccent` background + colored 16px icon (`Blue`) + 6px teal glow dot at right. Hover: 60% accent tint.

Bottom pinned "Engine Status" card (12 px margin, bordered): pulsing green dot + `"Sims 4 · 1.108.318"` + `"S4PE bridge · local"` subtext.

Header (top 56 px of rail): gradient teal→blue rounded square containing a Hammer icon, then `"Mod Constructor"` bold + `"V6 · Simple/Advanced Mode"` micro-caption.

Icons: use **FluentAvalonia** or **Projektanker.Icons.Avalonia.Lucide** to get the exact Lucide glyphs referenced in `Sidebar.tsx`.

---

## 4. TopBar (h=48)

Reference: `src/components/mc/TopBar.tsx`.

Left → right: sidebar collapse button, breadcrumb (`Projects / <active project> / <view>`), universal search (⌘K opens Command Palette), sync pill (`Online` green / `Offline` gray / `Syncing` teal spinner), theme toggle (sun/moon), notification bell (with unread dot), avatar.

Bottom hairline border in `Border` color. No shadow.

---

## 5. StatusBar (h=28)

Reference: `src/components/mc/StatusBar.tsx`.

Left: active project name · version · status pill.
Center: current build progress if any.
Right: OS badge (`macOS` / `Windows`) · lot51 sync state · zoom/scale (for canvas).

Text 11 px, muted; separators are 1 px vertical `Border` bars with 8 px horizontal padding.

---

## 6. Views (Content Area)

Reference: `src/components/mc/Views.tsx` + `src/components/mc/views/*`.

Each view is a top-level `UserControl`. Router key: the `SectionId` union from `src/components/mc/sections.ts`. Implement a `MainContentRegion` that swaps `UserControl`s based on the selected sidebar id.

Common view chrome: 24 px page padding, sticky page header (title + 12 px subtitle + right-aligned action buttons), then content grid.

### 6.1 Dashboard
`src/components/mc/Dashboard.tsx`. 12-column CSS grid → Avalonia `Grid` with 12 star columns, 16 px gutters.
- Row 1: **Current Project** card (col-span 5), **Quick Actions** (col-span 4), **Build Queue** (col-span 3).
- Row 2: **Constructor Canvas** (col-span 8, min-height 420), **Templates** (col-span 4).
- Row 3: **Metadata form** (4), **Live Preview** (4), **Validation** (4).
- Row 4: **Dependency Checker** (6), **Build Log** (6).

### 6.2 Builders
Career / Trait / Aspiration / Notification / Snippets: master-detail with a left list (280 px, searchable) and right detail with tabs.
- Career tabs: Identity · Levels · Branches · WFH Events · Messages · Advanced (Advanced-only).
- Trait tabs: Identity · Buffs · Behavior · Social · Blocks.
- Aspiration tabs: Identity · Milestones · Reward.

Each field row uses `PropertyField` semantics from `src/components/mc/inspector/PropertyField.tsx`: label (12 px muted) + control + optional lock button + validation slot + help tooltip.

### 6.3 Projects / Explorer / Assets / Templates / Icon Library / Community Library
Reference the `views/*` files 1:1 for filters, columns, and empty states. Asset Manager uses a `TreeView` (folders) + right grid; Icon Library uses a virtualized `ItemsRepeater` grid (215 icons, painterly render — port SVG paths from `IconArt.tsx`).

### 6.4 Insights (Activity / Analytics / Update Center / Dependency Graph)
Charts: use **LiveChartsCore** or **OxyPlot** for Avalonia. Dependency graph: **NodeNetwork** (Avalonia node editor library) — matches Constructor Canvas needs too.

### 6.5 Preview System
`src/components/mc/preview/*` — split-pane with `GridSplitter`. Left = editor, right = simulated game UI. Notification popups are rounded 16-radius cards with 4-stop gradient headers per `previewKind`.

---

## 7. Interactions

- **Command Palette (⌘K / Ctrl+K)**: modal centered, 640 px wide, fuzzy-search across `command-registry.ts`. Use **FluentAvalonia**'s `TaskDialog` or a custom `Popup`.
- **Shortcuts dialog (⌘/)**: table of key bindings; see `ShortcutsDialog.tsx`.
- **Notification Center**: right-side `Flyout`, 380 px wide, grouped by day.
- **Undo/redo**: ⌘Z / ⇧⌘Z globally — see `src/lib/inspector-history.tsx`.
- **Toasts**: bottom-right, 4 s auto-dismiss, level-tinted left border.
- **Copy To…**: contextual `MenuFlyout` per section — see `CopyToMenu.tsx`.
- **Advanced Mode**: toggle in Settings; persist to `AppSettings.AdvancedMode`; hides Advanced sidebar group, Advanced tabs, and internal hex IDs.

---

## 8. State & Persistence (mirror the web store)

- Port `src/lib/types.ts` verbatim into `Models/` as C# `record`s.
- Port `src/lib/store.tsx` reducer surface into an `IAppStore` service with `INotifyPropertyChanged` collections (`ObservableCollection<T>`).
- Storage adapter (`src/lib/storage-adapter.ts`): implement three drivers — `JsonFileAdapter` (default, `~/Library/Application Support/ModConstructorV6/state.json` on macOS, `%APPDATA%\ModConstructorV6\state.json` on Windows), `InMemoryAdapter` (tests), `BundleAdapter` (import/export `.mcbundle.json`).
- Bundle roundtrip must match `ProjectBundle` v2 exactly so ChatGPT App / web exports interoperate.

---

## 9. macOS Specifics

- Use `NativeMenuBar`; wire ⌘, ⌘Q, ⌘W, ⌘N per macOS HIG.
- Traffic lights via `ExtendClientAreaToDecorationsHint`.
- File pickers: `IStorageProvider` (works cross-platform).
- Default Sims 4 install search paths (from `Views.tsx` `PathField`):
  - `~/Library/Application Support/The Sims 4/`
  - `~/Documents/Electronic Arts/The Sims 4/`
- Respect system appearance: subscribe to `Application.ActualThemeVariantChanged`.
- Ship a signed `.app` bundle; retina assets @1x/@2x.

---

## 10. Recommended Avalonia Packages

- `Avalonia` 11.x, `Avalonia.Desktop`, `Avalonia.Themes.Fluent`.
- `FluentAvalonia` — command bar, TaskDialog, NavigationView primitives.
- `Projektanker.Icons.Avalonia.Lucide` — Lucide icon set (matches web).
- `LiveChartsCore.SkiaSharpView.Avalonia` — analytics charts.
- `NodeNetwork` — Constructor Canvas & Dependency Graph.
- `CommunityToolkit.Mvvm` — `ObservableObject`, `RelayCommand`.
- `System.Text.Json` — bundle/state persistence.

---

## 11. Fidelity Checklist for Codex

Before shipping any view, verify against the web source:
1. Sidebar group order and item labels match `Sidebar.tsx` exactly.
2. Color tokens match the OKLCH → sRGB conversion table in §2.
3. All fields listed in the corresponding `views/*.tsx` are present.
4. Advanced-only elements are hidden behind `AdvancedMode`.
5. Every action mutates state through `IAppStore` (no local shadow state), matching `UI_ACTION_INTEGRATION_MAP.md`.
6. Import/export produces byte-identical `.mcbundle.json` to the web build.
7. Light and dark themes both pass contrast at AA for body text.

---

_Source of truth for any ambiguity is the current web implementation under `src/`. When in doubt, read the referenced file._
