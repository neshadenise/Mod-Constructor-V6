/**
 * Aspiration Builder sections (Part 1).
 *
 * Identity, Availability, Resources & IDs, Localisation, Dependencies,
 * Validation and Advanced. Every control writes structured document data —
 * nothing here is decorative, and nothing is stored in loose component state.
 */

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Lightbulb,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { RefField } from "@/components/mc/trait/ResourcePicker";
import { MilestoneBuilder } from "./MilestoneBuilder";

import {
  Badge,
  Btn,
  Chip,
  EmptyHint,
  Field,
  NumberInput,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/mc/trait/primitives";
import {
  AGES,
  AGE_LABEL,
  ASPIRATION_CATEGORIES,
  ASPIRATION_TYPES,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  OCCULTS,
  OCCULT_LABEL,
  SPECIES,
  SPECIES_LABEL,
  aspirationTypeSpec,
  completeness,
  isVisible,
  makeMilestone,
  makeObjective,
  objectiveCount,
  sanitizeInternalName,
  type AspirationDoc,
  type AspirationTypeId,
  type AspirationCategoryId,
  type DifficultyId,
  type OccultMode,
  type GenderRule,
} from "@/lib/aspirations/schema";
import {
  STRING_USAGE,
  computeAspirationKeys,
  ensureStringKeys,
  previewKeys,
} from "@/lib/aspirations/ids";
import {
  incomingLinks,
  outgoingLinks,
  requiredPacks,
  type ResolveContext,
} from "@/lib/aspirations/resolver";
import type { AspirationValidation } from "@/lib/aspirations/validate";

export type AspirationSectionId =
  | "identity"
  | "availability"
  | "resources"
  | "strings"
  | "dependencies"
  | "validation"
  | "advanced";

export interface SectionProps {
  doc: AspirationDoc;
  patch: (fn: (d: AspirationDoc) => AspirationDoc) => void;
  ctx: ResolveContext;
  validation: AspirationValidation;
  focus?: string;
}

/** Resolve context for aspiration screens. */
export function useResolveContext(): ResolveContext {
  const store = useStore();
  const project = useActiveProject();
  return useMemo(
    () => ({ state: store.state, ...(project?.id ? { projectId: project.id } : {}) }),
    [store.state, project?.id],
  );
}

const ring = (focus: string | undefined, target: string) =>
  focus === target ? "rounded-md ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : "";

const issuesFor = (v: AspirationValidation, target: string) =>
  v.issues.filter((i) => i.target === target);

const firstError = (v: AspirationValidation, target: string) =>
  issuesFor(v, target).find((i) => i.level === "error")?.message;

/* ------------------------------------------------------------- identity -- */

export function IdentitySection({ doc, patch, validation, focus }: SectionProps) {
  const spec = aspirationTypeSpec(doc.aspirationType);
  const keys = computeAspirationKeys(doc);
  const nameLen = doc.description.length;

  const setName = (v: string) =>
    patch((d) => ({
      ...d,
      displayName: v,
      strings: { ...d.strings, displayName: { ...d.strings.displayName, text: v } },
    }));

  return (
    <div className="space-y-4">
      <Panel
        title="Basic information"
        subtitle="Player-facing identity. Renaming never changes internal ids or string keys."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className={ring(focus, "displayName")}>
            <Field
              label="Aspiration name"
              hint="Shown in CAS, Simology and every notification."
              {...(firstError(validation, "displayName")
                ? { error: firstError(validation, "displayName")! }
                : {})}
            >
              <TextInput value={doc.displayName} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>

          <div className={ring(focus, "internalName")}>
            <Field
              label="Internal name"
              hint="Unique in this project. Letters, numbers and underscores only."
              {...(firstError(validation, "internalName")
                ? { error: firstError(validation, "internalName")! }
                : {})}
            >
              <div className="flex gap-1.5">
                <TextInput
                  value={doc.ids.internalName}
                  onChange={(e) =>
                    patch((d) => ({ ...d, ids: { ...d.ids, internalName: e.target.value } }))
                  }
                  className="font-mono"
                />
                <Btn
                  icon={Wand2}
                  title="Generate from display name"
                  onClick={() =>
                    patch((d) => ({
                      ...d,
                      ids: { ...d.ids, internalName: sanitizeInternalName(d.displayName) },
                    }))
                  }
                >
                  {""}
                </Btn>
              </div>
            </Field>
          </div>

          <div className={ring(focus, "namespace")}>
            <Field
              label="Creator namespace"
              hint="Prefixes every generated tuning, loot, test set and hash."
              {...(firstError(validation, "namespace")
                ? { error: firstError(validation, "namespace")! }
                : {})}
            >
              <TextInput
                value={doc.ids.namespace}
                onChange={(e) =>
                  patch((d) => ({ ...d, ids: { ...d.ids, namespace: e.target.value } }))
                }
                className="font-mono"
              />
            </Field>
          </div>

          <div className={ring(focus, "icon")}>
            <Field
              label="Icon resource"
              hint="Project asset id, built-in icon key or an EA resource key."
              {...(firstError(validation, "icon")
                ? { error: firstError(validation, "icon")! }
                : {})}
            >
              <TextInput
                value={doc.icon}
                placeholder="ic_asp_master_fashion_critic"
                onChange={(e) => patch((d) => ({ ...d, icon: e.target.value }))}
                className="font-mono"
              />
            </Field>
          </div>
        </div>

        <div className={cn("mt-3", ring(focus, "description"))}>
          <Field
            label="Description"
            hint={`${nameLen} characters. Localised automatically — the string key never changes when you reword it.`}
          >
            <TextArea
              value={doc.description}
              onChange={(e) =>
                patch((d) => ({
                  ...d,
                  description: e.target.value,
                  strings: {
                    ...d.strings,
                    description: { ...d.strings.description, text: e.target.value },
                  },
                }))
              }
            />
          </Field>
        </div>

        <div className="mt-3 rounded-md border border-border bg-background/60 p-2.5 font-mono text-[10.5px] text-muted-foreground">
          {keys.tuningName} · {keys.tuning.instance}
        </div>
      </Panel>

      <Panel
        title="Classification"
        subtitle="Type drives which options the rest of the builder offers."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className={ring(focus, "aspirationType")}>
            <Field label="Aspiration type" hint={spec.hint}>
              <SelectInput<AspirationTypeId>
                value={doc.aspirationType}
                onChange={(v) => patch((d) => ({ ...d, aspirationType: v }))}
                options={ASPIRATION_TYPES.map((t) => ({ value: t.id, label: t.label }))}
              />
            </Field>
          </div>
          <div className={ring(focus, "category")}>
            <Field label="Category" hint="Groups the aspiration in CAS and selection menus.">
              <SelectInput<AspirationCategoryId>
                value={doc.category}
                onChange={(v) => patch((d) => ({ ...d, category: v }))}
                options={ASPIRATION_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
          </div>
          <Field label="Difficulty" hint="Metadata only unless you link gameplay scaling yourself.">
            <SelectInput<DifficultyId>
              value={doc.difficulty}
              onChange={(v) => patch((d) => ({ ...d, difficulty: v }))}
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Visibility
          </span>
          {(["auto", "visible", "hidden"] as const).map((v) => (
            <Chip
              key={v}
              active={doc.visibility === v}
              onClick={() => patch((d) => ({ ...d, visibility: v }))}
            >
              {v === "auto" ? `Auto (${spec.visibleByDefault ? "visible" : "hidden"})` : v}
            </Chip>
          ))}
          <Badge tone={isVisible(doc) ? "accent" : "muted"}>
            {isVisible(doc) ? "Appears in the aspiration picker" : "Never shown to the player"}
          </Badge>
        </div>
      </Panel>

      <Panel title="Developer notes" subtitle="Editor-only. Neither field is ever exported.">
        <div className={ring(focus, "summary")}>
          <Field label="Summary" hint="One line for your own list view.">
            <TextInput
              value={doc.summary}
              onChange={(e) => patch((d) => ({ ...d, summary: e.target.value }))}
            />
          </Field>
        </div>
        <div className={cn("mt-3", ring(focus, "notes"))}>
          <Field label="Notes" hint="Markdown, checklists, links, version notes.">
            <TextArea
              rows={6}
              value={doc.notes}
              onChange={(e) => patch((d) => ({ ...d, notes: e.target.value }))}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------------------------------- availability -- */

export function AvailabilitySection({ doc, patch, ctx, validation, focus }: SectionProps) {
  const a = doc.availability;
  const setA = (p: Partial<typeof a>) =>
    patch((d) => ({ ...d, availability: { ...d.availability, ...p } }));
  const packs = requiredPacks(doc, ctx);

  const toggle = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="space-y-4">
      <Panel
        title="Ages"
        subtitle="Objectives that no allowed age can complete are flagged automatically."
      >
        <div className={cn("flex flex-wrap gap-1.5", ring(focus, "ages"))}>
          {AGES.map((age) => (
            <Chip
              key={age}
              active={a.ages.includes(age)}
              onClick={() => setA({ ages: toggle(a.ages, age) })}
            >
              {AGE_LABEL[age]}
            </Chip>
          ))}
        </div>
        {firstError(validation, "ages") && (
          <p className="mt-2 text-[10.5px] text-red-500">{firstError(validation, "ages")}</p>
        )}
      </Panel>

      <Panel title="Species">
        <div className={cn("flex flex-wrap gap-1.5", ring(focus, "species"))}>
          {SPECIES.map((s) => (
            <Chip
              key={s}
              active={a.species.includes(s)}
              onClick={() => setA({ species: toggle(a.species, s) })}
            >
              {SPECIES_LABEL[s]}
            </Chip>
          ))}
        </div>
      </Panel>

      <Panel title="Occult restrictions" subtitle="Choose how the selected occults are applied.">
        <div className="flex flex-wrap gap-1.5">
          {(["any", "allow-only", "exclude", "require-one", "require-all"] as OccultMode[]).map(
            (m) => (
              <Chip key={m} active={a.occultMode === m} onClick={() => setA({ occultMode: m })}>
                {m === "any" ? "Any Sim" : m.replace("-", " ")}
              </Chip>
            ),
          )}
        </div>
        {a.occultMode !== "any" && (
          <div className={cn("mt-3 flex flex-wrap gap-1.5", ring(focus, "occults"))}>
            {OCCULTS.map((o) => (
              <Chip
                key={o}
                active={a.occults.includes(o)}
                onClick={() => setA({ occults: toggle(a.occults, o) })}
              >
                {OCCULT_LABEL[o]}
              </Chip>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Gender">
        <div className={cn("grid gap-3 md:grid-cols-2", ring(focus, "gender"))}>
          <Field label="Rule">
            <SelectInput<GenderRule>
              value={a.gender}
              onChange={(v) => setA({ gender: v })}
              options={[
                { value: "none", label: "No restriction" },
                { value: "masculine-frame", label: "Masculine frame" },
                { value: "feminine-frame", label: "Feminine frame" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "custom", label: "Custom test" },
              ]}
            />
          </Field>
          {a.gender === "custom" && (
            <Field label="Custom test set" hint="Tuning name of the test set to run.">
              <TextInput
                value={a.genderCustomTest}
                onChange={(e) => setA({ genderCustomTest: e.target.value })}
                className="font-mono"
              />
            </Field>
          )}
        </div>
      </Panel>

      <Panel
        title="Pack requirements"
        subtitle="Detected from everything this aspiration touches. You cannot claim base game while referencing DLC."
      >
        <div className={cn("space-y-2", ring(focus, "claimsBaseGame"))}>
          <Toggle
            checked={a.claimsBaseGame}
            onChange={(v) => setA({ claimsBaseGame: v })}
            label="Base game compatible"
          />
          {packs.length ? (
            <div className="flex flex-wrap gap-1.5">
              {packs.map((p) => (
                <Badge key={p} tone={a.claimsBaseGame ? "error" : "accent"}>
                  {p}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyHint>No pack content detected. Base game only.</EmptyHint>
          )}
          <Field
            label="Additional packs"
            hint="Comma separated. Use for content the detector cannot see."
          >
            <TextInput
              value={a.extraPacks.join(", ")}
              onChange={(e) =>
                setA({
                  extraPacks: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------- resources -- */

export function ResourcesSection({ doc, patch, ctx, validation, focus }: SectionProps) {
  const keys = computeAspirationKeys(doc);
  const preview = previewKeys(doc.ids.namespace, doc.ids.internalName);

  return (
    <div className="space-y-4">
      <Panel
        title="Reward trait"
        subtitle="Stored by project id, not by tuning number — renaming the trait never breaks this link."
      >
        <div className={ring(focus, "rewardTrait")}>
          <RefField
            label="Reward trait"
            expects="Trait"
            value={doc.rewardTrait}
            onChange={(ref) => patch((d) => ({ ...d, rewardTrait: ref }))}
            {...(firstError(validation, "rewardTrait")
              ? { status: { status: "missing", message: firstError(validation, "rewardTrait")! } }
              : {})}
          />
        </div>
      </Panel>

      <Panel
        title="Connected resources"
        subtitle="Loot, buffs, notifications, careers, statistics — anything this aspiration should carry into the package."
        actions={
          <Btn
            onClick={() => patch((d) => ({ ...d, connections: [...d.connections, null as never] }))}
            className="hidden"
          >
            {""}
          </Btn>
        }
      >
        {doc.connections.length === 0 ? (
          <EmptyHint>
            No extra resources attached yet. Milestone rewards and objective tests are added in the
            Milestones section.
          </EmptyHint>
        ) : (
          <div className="space-y-2">
            {doc.connections.map((ref, i) => (
              <div
                key={`${ref.tuningName}-${i}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold">
                    {ref.label || ref.tuningName}
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {ref.resourceKind} · {ref.source} · {ref.tuningName}
                  </div>
                </div>
                <Btn
                  variant="danger"
                  onClick={() =>
                    patch((d) => ({ ...d, connections: d.connections.filter((_, j) => j !== i) }))
                  }
                >
                  Remove
                </Btn>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <RefField
            label="Attach another resource"
            expects="Loot"
            value={null}
            onChange={(ref) =>
              ref && patch((d) => ({ ...d, connections: [...d.connections, ref] }))
            }
            hint="Pick from project records, game resources or another creator's mod."
          />
        </div>
      </Panel>

      <Panel
        title="Generated identifiers"
        subtitle="Deterministic — the same names always produce the same keys."
      >
        <dl className="grid gap-2 text-[11.5px] md:grid-cols-2">
          <IdRow label="Project UUID" value={doc.ids.uuid} note="Permanent. Never changes." />
          <IdRow label="Tuning name" value={keys.tuningName} />
          <IdRow label="Hash input" value={keys.hashInput} />
          <IdRow label="Tuning instance (hex)" value={keys.tuning.instance} />
          <IdRow label="Tuning instance (dec)" value={keys.tuningDecimal} />
          <IdRow label="SimData instance" value={keys.simData.instance} />
          <IdRow label="FNV-1a 32" value={keys.fnv32} />
          <IdRow
            label="Resource key"
            value={`${keys.tuning.type}:${keys.tuning.group}:${keys.tuning.instance}`}
          />
        </dl>
        {preview.instance !== keys.tuning.instance && (
          <p className="mt-2 text-[10.5px] text-amber-500">
            A manual instance override is active. Derived value would be {preview.instance}.
          </p>
        )}
        {firstError(validation, "tuningId") && (
          <p className="mt-2 text-[10.5px] text-red-500">{firstError(validation, "tuningId")}</p>
        )}
      </Panel>

      {keys.milestones.length > 0 && (
        <Panel title="Child resources" subtitle="Generated for each milestone and objective.">
          <div className="space-y-2">
            {keys.milestones.map((m) => (
              <div key={m.id} className="rounded-md border border-border bg-background/60 p-2.5">
                <div className="font-mono text-[11px]">{m.tuningName}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{m.key.instance}</div>
                {m.objectives.map((o) => (
                  <div key={o.id} className="mt-1 pl-3 font-mono text-[10px] text-muted-foreground">
                    ↳ {o.tuningName} · {o.key.instance}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function IdRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-2.5 py-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate font-mono text-[11px]">{value}</dd>
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- strings -- */

export function StringsSection({ doc, patch, focus }: SectionProps) {
  const strings = ensureStringKeys(doc);
  const rows: {
    field: string;
    label: string;
    text: string;
    key: string;
    set: (v: string) => void;
  }[] = [
    {
      field: "display_name",
      label: "Display name",
      text: doc.strings.displayName.text,
      key: strings.displayName.key,
      set: (v) =>
        patch((d) => ({
          ...d,
          displayName: v,
          strings: { ...d.strings, displayName: { ...d.strings.displayName, text: v } },
        })),
    },
    {
      field: "description",
      label: "Description",
      text: doc.strings.description.text,
      key: strings.description.key,
      set: (v) =>
        patch((d) => ({
          ...d,
          description: v,
          strings: { ...d.strings, description: { ...d.strings.description, text: v } },
        })),
    },
    {
      field: "tooltip",
      label: "Tooltip",
      text: doc.strings.tooltip.text,
      key: strings.tooltip.key,
      set: (v) =>
        patch((d) => ({
          ...d,
          strings: { ...d.strings, tooltip: { ...d.strings.tooltip, text: v } },
        })),
    },
    {
      field: "completion_notification",
      label: "Completion notification",
      text: doc.strings.completionNotification.text,
      key: strings.completionNotification.key,
      set: (v) =>
        patch((d) => ({
          ...d,
          strings: {
            ...d.strings,
            completionNotification: { ...d.strings.completionNotification, text: v },
          },
        })),
    },
    {
      field: "reward_notification",
      label: "Reward notification",
      text: doc.strings.rewardNotification.text,
      key: strings.rewardNotification.key,
      set: (v) =>
        patch((d) => ({
          ...d,
          strings: {
            ...d.strings,
            rewardNotification: { ...d.strings.rewardNotification, text: v },
          },
        })),
    },
    {
      field: "journal_text",
      label: "Journal text",
      text: doc.strings.journalText.text,
      key: strings.journalText.key,
      set: (v) =>
        patch((d) => ({
          ...d,
          strings: { ...d.strings, journalText: { ...d.strings.journalText, text: v } },
        })),
    },
  ];

  return (
    <Panel
      title="Localisation"
      subtitle="Keys are assigned once and preserved. Rewording never breaks an existing translation."
    >
      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.field}
            className={cn(
              "rounded-md border border-border bg-background/60 p-2.5",
              ring(focus, r.field),
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {r.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {r.key ? `0x${r.key}` : "key assigned on first save"}
              </span>
            </div>
            <TextArea rows={2} value={r.text} onChange={(e) => r.set(e.target.value)} />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Used by: {(STRING_USAGE[r.field] ?? ["—"]).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------- dependencies -- */

export function DependenciesSection({
  doc,
  ctx,
  onOpen,
}: SectionProps & { onOpen?: (kind: string, id: string) => void }) {
  const out = outgoingLinks(doc, ctx);
  const incoming = incomingLinks(doc, ctx);
  const packs = requiredPacks(doc, ctx);

  return (
    <div className="space-y-4">
      <Panel title="Uses" subtitle="Everything this aspiration points at, resolved right now.">
        {out.length === 0 ? (
          <EmptyHint>Nothing connected yet.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {out.map((l) => (
              <li
                key={l.path}
                className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5"
              >
                <Badge tone={l.status === "ok" ? "ok" : "error"}>{l.status}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold">{l.label}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {l.kind} · {l.source} · {l.path}
                  </div>
                </div>
                {l.openIn && l.recordId && (
                  <Btn icon={ArrowUpRight} onClick={() => onOpen?.(l.openIn!, l.recordId!)}>
                    Open
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="muted">{doc.milestones.length} milestones</Badge>
          <Badge tone="muted">{objectiveCount(doc)} objectives</Badge>
          <Badge tone="muted">{doc.rewardTrait ? "1 reward trait" : "no reward trait"}</Badge>
          {packs.map((p) => (
            <Badge key={p} tone="accent">
              {p}
            </Badge>
          ))}
        </div>
      </Panel>

      <Panel
        title="Referenced by"
        subtitle="Other project records that point back at this aspiration."
      >
        {incoming.length === 0 ? (
          <EmptyHint>Nothing references this aspiration yet.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {incoming.map((l) => (
              <li
                key={`${l.kind}:${l.id}:${l.path}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5"
              >
                <Badge tone="muted">{l.kind}</Badge>
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{l.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{l.path}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------ validation -- */

const LEVEL_ICON = {
  error: AlertTriangle,
  warning: Info,
  suggestion: Lightbulb,
} as const;

export function ValidationSection({
  doc,
  validation,
  onJump,
}: SectionProps & { onJump?: (issue: AspirationValidation["issues"][number]) => void }) {
  return (
    <div className="space-y-4">
      <Panel title="Validation" subtitle="Runs continuously. Errors block export; warnings do not.">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge tone={validation.errors ? "error" : "ok"}>{validation.errors} errors</Badge>
          <Badge tone={validation.warnings ? "warn" : "muted"}>
            {validation.warnings} warnings
          </Badge>
          <Badge tone="muted">{validation.suggestions} suggestions</Badge>
          <Badge tone={validation.score > 80 ? "ok" : validation.score > 50 ? "warn" : "error"}>
            health {validation.score}
          </Badge>
          <Badge tone="muted">{completeness(doc)}% complete</Badge>
        </div>

        {validation.issues.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2 text-[12px]">
            <CheckCircle2 className="h-4 w-4 text-[var(--green,#22c55e)]" />
            Everything checks out. This aspiration is ready to export.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {validation.issues.map((i) => {
              const Icon = LEVEL_ICON[i.level];
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onJump?.(i)}
                    className="flex w-full items-start gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        i.level === "error" && "text-red-500",
                        i.level === "warning" && "text-amber-500",
                        i.level === "suggestion" && "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px]">{i.message}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {i.code} · {i.section}
                        {i.fix ? ` · ${i.fix}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------- advanced -- */

export function AdvancedSection({ doc, patch }: SectionProps) {
  const keys = computeAspirationKeys(doc);
  return (
    <div className="space-y-4">
      <Panel
        title="Manual instance overrides"
        subtitle="Only touch these when you are matching an existing package. Leave empty to stay deterministic."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tuning instance (hex)" hint="16 hex digits.">
            <TextInput
              value={doc.ids.manualTuningInstance ?? ""}
              placeholder={keys.tuning.instance}
              onChange={(e) =>
                patch((d) => ({
                  ...d,
                  ids: { ...d.ids, manualTuningInstance: e.target.value.trim() || undefined },
                }))
              }
              className="font-mono"
            />
          </Field>
          <Field label="SimData instance (hex)" hint="Must match the tuning instance to pair.">
            <TextInput
              value={doc.ids.manualSimDataInstance ?? ""}
              placeholder={keys.simData.instance}
              onChange={(e) =>
                patch((d) => ({
                  ...d,
                  ids: { ...d.ids, manualSimDataInstance: e.target.value.trim() || undefined },
                }))
              }
              className="font-mono"
            />
          </Field>
        </div>
        <div className="mt-3 flex gap-1.5">
          <Btn
            icon={RefreshCw}
            onClick={() => {
              patch((d) => ({
                ...d,
                ids: {
                  ...d.ids,
                  manualTuningInstance: undefined,
                  manualSimDataInstance: undefined,
                },
              }));
              toast.success("Overrides cleared — ids are derived again");
            }}
          >
            Regenerate from name
          </Btn>
        </div>
      </Panel>

      <Panel title="Build state" subtitle="Recorded after a successful export.">
        <div className="grid gap-3 md:grid-cols-2">
          <IdRow
            label="Last built"
            value={doc.ids.lastBuiltAt ? new Date(doc.ids.lastBuiltAt).toLocaleString() : "never"}
          />
          <IdRow label="Last built instance" value={doc.ids.lastBuiltInstance ?? "—"} />
        </div>
        <div className="mt-3">
          <Toggle
            checked={Boolean(doc.ids.testedInGame)}
            onChange={(v) => patch((d) => ({ ...d, ids: { ...d.ids, testedInGame: v } }))}
            label="I have tested this aspiration in-game"
          />
        </div>
      </Panel>

      <Panel title="Milestone points" subtitle="Satisfaction points awarded per milestone.">
        {doc.milestones.length === 0 ? (
          <EmptyHint>No milestones yet.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {doc.milestones.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-[11px] font-semibold">{m.tier}</span>
                <span className="min-w-0 flex-1 truncate text-[12px]">{m.title}</span>
                <NumberInput
                  value={m.points}
                  min={0}
                  step={50}
                  className="w-28"
                  onChange={(v) =>
                    patch((d) => ({
                      ...d,
                      milestones: d.milestones.map((x, j) => (j === i ? { ...x, points: v } : x)),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------ milestones -- */

/**
 * Milestones delegate to the full Part 2 progression tree: drag-and-drop
 * structure on the left, milestone/objective inspectors on the right, and a
 * live journal preview underneath.
 */
export function MilestonesSection({
  doc,
  patch,
  validation,
  focus,
  recordId,
  projectId,
}: SectionProps & { recordId?: string; projectId?: string }) {
  return (
    <MilestoneBuilder
      doc={doc}
      patch={patch}
      validation={validation}
      {...(focus ? { focus } : {})}
      {...(recordId ? { recordId } : {})}
      {...(projectId ? { projectId } : {})}
    />
  );
}
