# Mod Architect Studio V6 — Production Overhaul Plan

This is a very large scope (23 systems). To keep the visual language intact and avoid a half-working mega-refactor, I'll ship it in 6 phases. Each phase is independently useful and builds on the previous one. After each phase you can review and re-prioritize.

Nothing here changes the current light theme, typography, spacing, or card styling — every new surface reuses the existing tokens and shadcn primitives already in the project.

## Phase 1 — Shared Foundation (this turn)

The pieces every other phase depends on. Building these first prevents duplicated UI later.

1. **Command Palette** (Ctrl/Cmd+K) — shadcn `Command` dialog with grouped actions: Create Career/Trait/Aspiration, Generate Icon, Validate, Export, Toggle Advanced, Open Settings, Import Assets, Duplicate Branch, Find References, Generate XML.
2. **Universal Search** — same `Command` primitive, indexes projects, careers, traits, aspirations, buffs, notifications, assets, IDs, validation issues, recent files, settings, templates. Opens from top bar or `/`.
3. **Notification Center** — right-side drawer + bell in top bar. Toast + persistent log for background builds, validation, exports, updates, undo.
4. **Enhanced Status Bar** — expand existing bar with: game version, project version, validation status, build status, autosave, provider status, online/offline, selection count, CPU/memory placeholders, git placeholder.
5. **`PropertyField` primitive** (`src/components/mc/inspector/PropertyField.tsx`) — one component for every editable field with label, subtitle, tooltip, example, validation state, reset, copy, paste, duplicate, lock, favorite, recently-edited highlight. Variants: text, number, slider, switch, chips, color, icon, asset, select, multi-select, reorderable list, reference, conditional.
6. **Inspector History context** — undo/redo stack + per-field history (last edited time, previous value, restore). Wired into `PropertyField`.

## Phase 2 — Workspace Systems

7. **Project Explorer** — tree view with folders, right-click menu (rename, duplicate, delete, move, color label, favorite, pin), recently opened.
8. **Asset Manager 2.0** — thumbnail/list/details view toggle, tags, collections, favorites, unused finder, duplicate finder, "Where Used", bulk rename/move/delete, replace-everywhere, drag-drop, version history strip.
9. **Reference Viewer** — per-asset panel showing Used By / Dependencies / Broken / Circular refs with clickable navigation.
10. **Validation Center** — dashboard grouping Errors/Warnings/Suggestions/Info; each row has severity, builder, field, reason, fix, jump-to, ignore, auto-fix, related; filter/search/group/export.

## Phase 3 — AI & Integrations

11. **AI Workspace** — dedicated section with sidebar (prompt history, saved, favorites, recent generations), tabs for Image/Text/Validation/Docs, context selector, project memory, conversation history. Insert-into-project approval flow.
12. **Integrations page** — provider cards (ChatGPT App, OpenAI API, Replicate, Stability, HuggingFace, Local AI, Custom). Each shows status, capabilities, model selector, usage, connect/disconnect. Pluggable `IntegrationProvider` interface — no hardcoded impls.

## Phase 4 — Visual & Simulation

13. **Visual Graph** — node editor showing relationships between careers/traits/buffs/loot/notifications/interactions/conditions/rewards. Selecting a node opens inspector.
14. **Live Simulator** — expand existing preview: career panel, CAS preview, promotion popup, work/WFH popup, reward notification, buff tooltip, moodlet panel, calendar, relationship panel, phone UI, career-join screen, promotion history, multiple Sims, zoom, device scaling.

## Phase 5 — Build & Analytics

15. **Build Center** — queued/completed/failed tabs, per-build logs, warnings, errors, package size, files generated, duration, incremental, cancel, retry, clean build, open folder.
16. **Project Analytics** — dashboard widgets: completion, missing assets, validation score, unused assets, duplicate IDs, builder progress, lines generated, estimated XML count, recent activity, exports.
17. **Template Marketplace** — browser for Career/Trait/Notification/Aspiration templates with Favorites, Installed, Official, Community tabs, import/export.
18. **Project Settings** — tabs for General, Metadata, Packaging, Localization, Dependencies, Build Profiles, Namespaces, Author, License, Versioning, Compatibility, Game Packs, Output Folders, Autosave, Cloud Sync.

## Phase 6 — Polish

19. **Workspace Customization** — dockable/resizable panels, save layout, reset, builder-specific layouts, compact/accessibility/focus modes.
20. **Beginner vs Advanced** — audit every builder; ensure Simple hides all XML/tuning fields, Advanced exposes everything, switching preserves data.
21. **Accessibility pass** — keyboard shortcuts overlay, high-contrast token, large-text scale, reduced-motion, screen-reader labels on every icon-only button.
22. **Onboarding & Polish** — first-run tour, empty states, contextual tips, skeleton loaders, keyboard shortcut overlay (`?`), recent-activity timeline, micro animations.

## Technical notes

- Every new field re-exports through `PropertyField`. Existing builders get migrated incrementally — Phase 1 introduces the primitive without breaking current forms.
- Command Palette + Universal Search share one `useCommandRegistry()` hook so commands and search results come from the same source of truth.
- Inspector History is a React context at the root; `PropertyField` writes to it on every commit.
- Notification Center replaces direct `sonner` calls with a `useNotifications()` API that fans out to both toast and drawer.
- Integrations expose an `IntegrationProvider` TS interface (`id`, `name`, `capabilities`, `connect()`, `disconnect()`, `models()`, `usage()`). New providers register into a registry — zero UI changes required.
- Visual Graph reuses the existing Constructor Canvas rendering primitives.
- All new panels use the existing `card-elevated`, `surface-card`, and `grid-canvas` utilities. No new color tokens.

## Deliverable for this turn

Phase 1 only — Command Palette, Universal Search, Notification Center, expanded Status Bar, `PropertyField` primitive with all variants and controls, Inspector History context. Wire the palette and search into the top bar, wire notifications into existing toast call-sites, and migrate one builder (Career Identity tab) to `PropertyField` as the reference implementation for later phases.
