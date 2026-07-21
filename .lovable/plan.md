# Copy Rewards / Branches / Perks / Salary

Currently the Career Builder shows a single promotion track, a perks list, and a base salary field with no way to reuse them. This plan adds a lightweight "copy to…" flow across the builders so non-coders can duplicate content without retyping it.

## Scope (UI-only prototype)

Add copy actions in three places:
1. **Promotion Track** card — copy a single rank, or the whole branch.
2. **Perks & Rewards** card — copy one perk, or the whole list.
3. **Career Identity** — copy Base Salary (and Work Hours) as a package.

Same pattern reused in **Trait Builder** (rewards list) and **Aspiration Builder** (milestone rewards) so the interaction is consistent.

## The "Copy to…" picker

A small popover triggered by a `Copy` icon button on each row and each card header. It offers three destination scopes:

- **Another branch** (within this career) — pick from a mock branch list: Astronaut → Space Ranger, Astronaut → Interstellar Smuggler, etc.
- **Another section** (another builder in this project) — Trait Builder, Aspiration Builder, Tuning Editor.
- **Another project** — mock list of recent projects (Epic Careers Pack, Cozy Life Mod, Sci-Fi Overhaul).

Multi-select destinations allowed. Confirm with a toast: "Copied 3 perks to Space Ranger branch and Cozy Life Mod."

## Where the buttons appear

```text
Promotion Track card
  header:  [＋ Add Rank]  [⧉ Copy branch to…]
  each row: hover → [⧉] icon to copy that rank only

Perks & Rewards card
  header:  [⧉ Copy all perks to…]
  each row: hover → [⧉] icon to copy that perk only

Career Identity card
  next to Base Salary field: [⧉] icon → "Copy salary & hours to…"
```

## Branch switcher (bonus, small)

Above the Promotion Track card, a compact branch tab strip:
`[Astronaut ▾]  [+ New branch]`
Switching tabs swaps the mock rank/perk data. Enables the "copy from A to B" story visually. No routing changes.

## Non-goals

- No real persistence — this is prototype UI, so copies are simulated with toasts and (optionally) in-memory state so the destination card visibly updates when the user stays in the same session.
- No changes to Advanced-mode XML output beyond re-rendering with copied data.
- No cross-project data model — the "other projects" list is mocked.

## Technical notes

- New component `CopyToMenu.tsx` in `src/components/mc/` — a shadcn `Popover` + checkbox list + Copy button.
- New mock data in `src/lib/mock-data.ts` (or inline): `MOCK_BRANCHES`, `MOCK_SECTIONS`, `MOCK_PROJECTS`.
- Edits limited to `src/components/mc/Views.tsx` (`CareerBuilder`, `TraitBuilder`, `AspirationBuilder`) plus the new component.
- Icons: `Copy`, `CopyPlus` from lucide-react (already a dependency).
- All copy actions produce `sonner` toasts; destinations arrays feed the toast description so users see exactly where content landed.
- Respects Advanced mode: copy buttons remain available in Simple mode (this is a usability feature, not an advanced one).
