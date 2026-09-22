# Roadmap

## Done (2026-09-21)
- [x] Export: reuse imported SimData companions; missing companions warn instead of blocking. Export verified end to end in preview (zip + package + README + manifest).
- [x] Imported mods survive reload for the Export Center (`hydrateImportRegistry` rehydrates the IndexedDB session).
- [x] Validation Center now runs on real project findings with working "Open in Builder" / hide; removed fabricated findings.
- [x] Build Queue lists real build jobs for the active project; Cancel All / Queue Build / per-job cancel + retry all work.
- [x] Removed the fake "Build Package" stub; that panel now writes a real .mcbundle.json.
- [x] Status bar shows real saved time, storage usage, cached game version and project version.
- [x] Deleted the dead duplicate validation screen.

- [x] Package Importer now runs game files through the same analyze/group/validate pipeline as the Mod Importer (shared `modimport/pipeline-actions.ts`), saving files + hydrating builders.
- [x] Detach-preview button replaced with a working full-screen toggle; AI icon button in the property inspector opens the icon generator; command palette "AI icon" opens the Icon Library.

## Done (2026-09-22)
- [x] Pack mechanics build generators: clubs, royalty, legacy and pack rules now lower into snippet tuning + STBL and are written into the exported package (`src/lib/modexport/pack-serializer.ts`). Build-support badges now report real capability (no SimData synthesis, no Python generator).

## Remaining
- [ ] Nothing open.


## Done (2026-09-22) — Real SimData companions
Generated career/track/level/trait/buff/aspiration/milestone tuning now ships
with a real SimData companion: an imported donor of the same class when one
exists, otherwise the built-in Mod Constructor 5 template set, and a ported
from-scratch writer for CareerTrack (variable-length row). SIMDATA_UNSUPPORTED
no longer fires for builder content; "Allow tuning-only package" is no longer
required. Verified: Demo Project_v0.1.0.package, 68,958 B, DBPF v2.1, 79
entries (39 tuning + 39 SimData + 1 STBL), every companion reopened as DATA
v0x101.

## Done (2026-09-23) — Builder audit

- Snippets Library now reads and writes the project store (create, edit, tag,
  favourite, delete, persisted); documented as reusable text, not a resource.
- Custom Dynasty has a real build path: `dynasty-serializer.ts` lowers identity,
  hierarchy roles and values into snippet tuning + STBL, wired through
  `snapshot.ts` and the Export Center.
- Notification editor gained a presentation-type selector (TNS, modal, banner,
  milestone, phone) and an icon picker bound to project assets.
- Placeholder data removed: the fake "Compile" toasts are now real Save + open
  Export Center actions, and the Career/Trait builders start empty instead of
  seeded with demo values.
- Exporter excludes incomplete records with an actionable `RESOURCE_EXCLUDED`
  message and keeps the underlying validation codes in the report; the build
  only fails when nothing at all is exportable.
- Tests: `src/lib/modexport/__tests__/builders.test.ts` covers notification,
  dynasty, draft projection and exclusion behaviour. 55 tests pass, typecheck
  clean. Verified export: Demo Project_v0.1.0.package, 69,993 B, 81 entries
  (41 tuning + 39 SimData + STBL), every companion reopened.

## Remaining

- Nothing open.

## Done (2026-09-24) — TDESC requirement checks
- Required/recommended tunable table per class derived from the Lot51 TDESC browser (src/lib/gamedata/required-fields.ts), checked at export (src/lib/modexport/tdesc-check.ts) and shown inline in the Career, Trait, Aspiration and Notification builders with a link to the class schema.
- SimData companions are only cloned/re-keyed from an imported donor or a mapped template (CareerTrack written from its documented schema); anything with no mapping is left out with import instructions. Provenance listed in the exporter.
- Verified in preview: Demo Project_v0.1.0.package, 69,993 B, DBPF v2.1, 81 entries; 0 errors. 63 tests pass, typecheck clean.

## Remaining
- Nothing open.
