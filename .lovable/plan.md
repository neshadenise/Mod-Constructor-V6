# Creator prefix for exported file names

Exported files should follow the community convention `CreatorName_ModTitle`, e.g.
`NeshaDenise_DancerCareer_v1.2.package`. The prefix comes from a dedicated, editable
setting — not from the project's Author field — and only affects file and folder names,
never internal tuning IDs. Existing projects and already-imported mods are left alone.

## What changes

**A creator prefix setting**
- New field in Settings (Interface / Export area): "Creator prefix", with a short
  explanation and a live example of the resulting file name.
- Defaults to a normalized form of the current project author the first time it is
  empty (spaces removed, unsafe characters stripped), and stays editable after that.
- Stored once for the workspace, so every project inherits it.

**Applied to export names only**
- Package, ZIP, folder, validation-report, and `.ts4builder` names all get the prefix:
  `Prefix_Name` and `Prefix_Name_v1.2` when versioned names are on.
- If the mod title already starts with the prefix, it is not added twice.
- If the prefix is blank, names are exactly what they are today.
- Internal tuning names, instance IDs, and resource keys are untouched.

**Export Center**
- The naming row shows the exact resulting name (prefix + title + version + extension)
  so there is no guessing before hitting Export.
- The custom output name field keeps working: the prefix is applied to whatever title
  you type there, with a per-export "don't prefix this one" escape hatch.

## Technical notes

- `AppSettings` gains `creatorPrefix?: string`; the store seeds it from the active
  project author on first use and persists via the existing storage adapter.
- `src/lib/modexport/filenames.ts` gains `applyCreatorPrefix(base, prefix)`, reusing
  `sanitizeFileName` so reserved names and illegal characters stay handled.
  `versionedName` and `folderName` accept an optional prefix argument.
- `ExportRequest` gains `creatorPrefix?: string` (resolved from settings when the
  export is started) so the pipeline and snapshot stay pure functions of the request.
- Call sites updated: `snapshot.ts` package name, and the report / project-source /
  root folder / ZIP names in `pipeline.ts`.
- Tests added to `src/lib/modexport/__tests__/export-pipeline.test.ts`: prefix applied,
  no double prefix, blank prefix is a no-op, prefix combined with versioned names, and
  unchanged internal IDs.
