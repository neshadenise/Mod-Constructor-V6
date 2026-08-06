# Game Data Reference System (TDESC + Local Index + Built-ins)

## What Lot51 can and can't give us

Confirmed by checking lot51.cc directly:

- **Yes:** `tdesc.lot51.cc` publishes TDESC schema files for every tuning class (Careers, CareerLevels, CareerTracks, Buffs, Traits, Aspirations, Statistics…), tracked against the current game version (site shows game 1.126.73, TDESC 1.126.58). These define **field names, types, defaults, allowed enums, and required attributes**.
- **Yes:** version status + Core Library release info (useful for "check for updates" and dependency records).
- **No:** EA's actual **instance IDs** for base-game content (specific buffs, skills, career tracks you want to reference).
- **No:** EA's **localized strings** (STBL text) — that's copyrighted game data and only exists in the user's install.

So a single source isn't enough. Three layers, phased.

## Phase 1 — TDESC Sync (online once, offline after)

- New `src/lib/gamedata/tdesc/` module: fetch a TDESC set, normalize it into a compact JSON schema index (class → fields → type/default/enum), version-stamp it, and cache in IndexedDB so it works fully offline afterward.
- New **Game Data** view (sidebar, under Reference): shows cached TDESC version vs. latest, one-click "Sync from Lot51", cache size, and a class browser with a search box.
- Wire into validation: builders check their generated tuning fields against the cached TDESC, flagging unknown fields, wrong types, and invalid enum values as Health findings.
- Ship a small bundled snapshot so a fresh, never-online install still validates.

## Phase 2 — Local Game-Data Indexer

- New `src/lib/gamedata/index-scan.ts`: user points at their Sims 4 install (reuse the existing OS-aware `PathField` + directory picker). We scan base-game `.package` files with the existing DBPF parser.
- Two passes: **tuning pass** (instance ID + class + name for careers, buffs, traits, statistics, interactions) and **string pass** (STBL key → text for the chosen language).
- Result is stored on-device only in IndexedDB, never uploaded and never bundled into exports — it's a lookup index, not redistributed content. Progress UI with cancel; scanning is incremental and resumable.
- Reference pickers throughout the builders (buff picker, skill picker, career-track picker, string picker) query this index and insert the real ID, showing the human-readable name.

## Phase 3 — Curated Built-in ID List

- `src/lib/gamedata/builtin-ids.ts`: a hand-verified set of the most commonly referenced base-game IDs (core skills, common buffs, standard career tracks, funds/statistics) so pickers are useful with no game install and no internet.
- Pickers merge three sources with clear provenance badges: **Built-in**, **Indexed (your game)**, **Custom (this project)**.
- Unknown/unresolved IDs referenced by a project surface as Health findings with a "resolve with picker" action.

## Technical notes

- All three caches live in IndexedDB alongside the existing import session store, so nothing resets on app update.
- TDESC fetch goes through a small server route (`src/routes/api/public/tdesc-sync.ts`) to avoid browser CORS issues with lot51.cc, with the response normalized server-side before caching client-side.
- Zero network required at runtime: every layer degrades to the bundled snapshot + built-in list.
- Reuses existing pieces: DBPF parser (`src/lib/modimport/dbpf.ts`), STBL parsing (`tuning.ts`), OS detection and `PathField`, project-health finding model.
