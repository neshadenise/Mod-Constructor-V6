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
