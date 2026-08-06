# Make every imported resource editable and round-trippable

Right now an import of your mod reports **20 editable · 228 preserved · 229 unrecognised**. Two separate problems cause that, and a third stops edits from reaching a rebuilt package.

1. **229 "unrecognised"** — the app only knows ~35 resource type ids. Anything outside that short list falls through to "unknown format", even when the payload is plainly XML, a string table, an image, or a standard game data blob.
2. **228 "preserved as-is"** — correct behaviour for meshes/textures/SimData (you chose preserve-only), but they are shown as a failure rather than as normal.
3. **Edits don't round-trip.** Imported mods live only in the Mod Importer screen's temporary state. Files saved into the project become ordinary Explorer files with no link back to the resource they came from, so editing the XML there never reaches the export rebuild.

## What changes

### 1. Recognise (almost) everything
- Expand the resource type table to the full published Sims 4 type list (~120 entries: tuning variants, DATA/SimData, RCOL family, CAS, images, audio, footprints, name maps, catalog, region, animation, etc.), each labelled and marked preservable.
- Add a **content sniffer** for any type id still unknown: detect XML/text, STBL, DDS/PNG/RLE, DATA, RCOL, ZIP by magic bytes. A resource that sniffs as XML or STBL becomes **editable** even under an unrecognised type id; anything else becomes **preserved** with a real format label.
- Result: the "unrecognised" bucket should drop to near zero, and most of your 229 either become editable tuning or clearly-labelled preserved binaries.

### 2. Honest support coverage
- Rework the coverage panel into **Editable / Preserved byte-for-byte / Unknown**, with the type breakdown listed underneath.
- A mod with zero unknown resources is reported **Ready**, not "Partially supported" — preserved binaries are a normal, safe outcome, not a gap.

### 3. Everything editable in one place
- Saving to a project writes **every** resource, not just text ones: editable tuning as `.xml`, string tables as `.json`, preserved binaries as their real extension (`.dds`, `.simdata`, `.bin`, …) plus a `resources.json` manifest recording each file's resource key (type / group / instance), origin package, and compression.
- In the Project Explorer, XML/JSON/text files stay fully editable inline. Preserved binaries show a read-only detail card (type, key, size, format) — no binary editing, per your choice.

### 4. Round-trip back into a rebuilt .package
- Persist the imported mod session (metadata, component list, resource manifest, original bytes) in the project store instead of screen-local state, so it survives navigation and reload.
- On rebuild, the export engine reads each resource's current bytes from its Explorer file: edited XML/STBL is re-encoded, everything untouched is copied byte-for-byte from the original package. Deleted files drop out; nothing else changes.
- The Export Center gains a **Rebuild imported package** action showing edited vs verbatim resource counts, and verifies the written package re-reads with the same key set.

## Technical notes

- `src/lib/modimport/resource-types.ts` — full type registry + `sniffFormat(bytes)` fallback.
- `src/lib/modimport/analyze.ts` — classify via type table, then sniffer; only truly unknown payloads stay `preserved-unsupported`; status logic and support reasons updated.
- `src/lib/modimport/save-to-project.ts` — write all resources + `resources.json` key manifest.
- `src/lib/explorer.tsx` — keep a `resourceKey` on imported files so edits map back to a package entry.
- `src/lib/modimport/export.ts` / `src/lib/modexport/package-build.ts` — rebuild path sources payloads from Explorer files via the manifest.
- Import/export unit tests extended: sniffer classification, manifest round-trip, and edit-then-rebuild producing a package whose untouched entries are byte-identical.

## Not included

- No binary format editors (SimData, meshes, DDS) — preserved unchanged, as you chose.
- No new SimData serializer, so newly authored records still cannot generate SimData; imported SimData continues to round-trip untouched.
