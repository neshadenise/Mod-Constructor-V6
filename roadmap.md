# Roadmap

## Done (2026-09-21)
- [x] Export: reuse imported SimData companions; missing companions warn instead of blocking. Export verified end to end in preview (zip + package + README + manifest).
- [x] Imported mods survive reload for the Export Center (`hydrateImportRegistry` rehydrates the IndexedDB session).
- [x] Validation Center now runs on real project findings with working "Open in Builder" / hide; removed fabricated findings.
- [x] Build Queue lists real build jobs for the active project; Cancel All / Queue Build / per-job cancel + retry all work.
- [x] Removed the fake "Build Package" stub; that panel now writes a real .mcbundle.json.
- [x] Status bar shows real saved time, storage usage, cached game version and project version.
- [x] Deleted the dead duplicate validation screen.

## Remaining
- [ ] Package Importer path does not group companion files (main Mod Importer does) — unify on the grouping pipeline.
- [ ] Remaining stub buttons: detach preview window (simulated), AI icon generator action in the property inspector.
- [ ] Pack mechanics: some build generators are still unimplemented (already marked in the UI).
