# Trait Builder — full rebuild

The current Trait Builder is a single-file editor with local state and free-text fields. This rebuilds it as a real authoring tool: every effect becomes a typed resource reference, IDs and hashes are managed for you, and validation reflects whether the trait would actually load in-game.

Because this spans ~17 subsystems, it ships in four phases. Each phase leaves the app working.

## Phase 1 — Resource model and resolver (foundation)

New module `src/lib/traits/`:

- **Trait document schema** — a versioned object covering identity, eligibility, effects, acquisition, conflicts, reactions, strings, and IDs. Stored in the project's `Trait.builderState` so nothing existing breaks.
- **Stable IDs** — each trait gets an immutable project UUID (`trait_<uuid>`). Tuning name (`Namespace:trait_Name`), instance ID, and the SimData pair are derived from the namespace + internal name using the existing FNV service in `src/lib/modexport/ids.ts`. Renaming never regenerates; a deliberate "Regenerate IDs" command does, with a confirmation and a transactional reference update.
- **Reference objects** — all cross-resource links stored as `{ projectResourceId, resourceKind, source, tuningName, tuningId, expectedType }`, never bare numbers. External refs carry pack/creator/version metadata.
- **Resource Resolver** — one central resolver (`resolveRef`) used by every builder: project UUID → record, tuning name → ID, string field → STBL key, asset → resource key, trait → SimData pair. Backed by the existing Game Data registry for EA lookups.
- **String table service** — each localized field gets a stable STBL key that survives wording changes, with orphan detection and usage tracking.

## Phase 2 — Editor UI

Replaces the current tabbed editor.

- **Landing screen** — grid of the active project's traits with icon, name, internal name, type, category, visibility, ages, effect count, validation state, last edited, and per-card duplicate / rename / export / delete. Search plus filters for type, category, age, visibility, completion, validation. Create new / import / duplicate / from template. Only templates that can export correctly are offered.
- **Identity** — display name, internal name (sanitized, unique, never silently rewritten), creator namespace, description, icon picker (upload / project asset / built-in library / EA icon) with resolution, transparency, and missing-file warnings.
- **Type-driven form** — trait type controls visibility, CAS presence, category availability, purchasability, Simology display, and which sections render. Personality / reward / hidden / occult / etc. export with the correct classification.
- **Eligibility** — ages, species (gated by installed content), occult include/exclude, gender frames, and auto-computed pack requirements. Selections compile into real tests, not labels.
- **Resource Picker** — one shared picker (Current project / EA / Imported mods / Community / Recent / Favorites), searchable by name, tuning name, decimal, hex, type, pack, creator, tag; filtered to the expected resource type so a buff field cannot accept an interaction.

## Phase 3 — Effects, acquisition, rules

- **Effects workspace** — typed effect cards: trait buff (create / link / open in Buff Builder), motive, skill, statistic, autonomy, interaction unlocks and restrictions, loot actions, relationship modifiers and a trait-compatibility matrix, emotional effects, broadcasters, CAS/appearance effects. Each writes a real reference.
- **Acquisition & removal** — CAS, reward store (cost, entry, order, tests, exclusions), aspiration/career/interaction/loot awards, cheats, hidden-only. Reward-store entry points at the same canonical trait. Removal rules with cleanup loot.
- **Conflicts & requirements** — visual rule builder producing reusable test-set resources.
- **Reactions** — trigger / actor / target / conditions / cooldown / frequency / outcome / priority rows.
- **Navigation & dependency safety** — jump to any connected resource; deleting a referenced resource shows the dependents panel with Cancel / Replace / Disconnect / Delete anyway (Advanced only).

## Phase 4 — Validation, preview, export

- **Validation engine** — the blocking-error and warning lists from the spec, run continuously and again pre-export; every issue deep-links to the exact field via the existing reveal channel.
- **Project Health** — trait findings feed the existing scorer with the right severities; optional content does not penalize.
- **Previews** — CAS selection, Simology, reward store, tooltip, acquisition notification, icon, conflict warning, connected moodlets, each labeled a visual simulation.
- **Export** — resolve refs, emit trait XML + STBL + icon, include only selected dependencies, dependency manifest, build report, IDs preserved. Export scopes: whole project, trait + dependencies, template, raw XML/SimData, validation report, dependency report.
- **Autosave / undo** — every change autosaves to the active project, participates in undo/redo and project history, and never touches an inactive project.

## Known blocker: SimData

This build has no SimData writer (`src/lib/modexport/simdata.ts` deliberately throws instead of emitting a fake resource), and the game refuses trait tuning without a SimData companion. So Phase 4 will:

- generate and validate the XML/SimData **key pair** and classification agreement,
- emit trait XML, STBL, and icons,
- and mark the package non-loadable with a clear blocking error until a SimData serializer exists.

Writing a real trait SimData serializer is a separate piece of work; say the word and it becomes Phase 5.

## Technical notes

- New code lives in `src/lib/traits/` (schema, ids, resolver, validation, export) and `src/components/mc/trait/` (landing, editor sections, resource picker). `Views.tsx` keeps only a thin mount point.
- Persistence rides the existing store/`builderState` path, so old traits keep opening; a migration upgrades legacy drafts to the new schema on first load.
- Advanced Mode exposes raw tuning name, IDs, hash inputs, XML/SimData/manifest previews, and guarded ID overrides.
