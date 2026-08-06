/**
 * Trait Builder sections.
 *
 * Every section is a pure view over the trait document: it receives the doc
 * plus a patch function, and writes structured data back. No section keeps
 * long-lived state of its own.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageField } from "@/components/mc/ImageField";
import { useStore, useActiveProject } from "@/lib/store";
import {
  ACQUISITION_LABEL,
  AGES,
  EFFECT_EXPECTS,
  EFFECT_LABEL,
  OCCULTS,
  SPECIES,
  TRAIT_CATEGORIES,
  TRAIT_TYPES,
  VISIBILITY_OPTIONS,
  isVisible,
  makeCompatibility,
  makeConflict,
  makeEffect,
  makeReaction,
  makeRequirement,
  sanitizeInternalName,
  traitTypeSpec,
  type AcquisitionMethod,
  type AgeId,
  type EffectKind,
  type OccultId,
  type SpeciesId,
  type TraitCategoryId,
  type TraitDoc,
  type TraitEffect,
  type TraitTypeId,
  type VisibilityId,
} from "@/lib/traits/schema";
import {
  ALL_STRING_FIELDS,
  STRING_USAGE,
  computeTraitKeys,
  ensureStringKeys,
  orphanStrings,
  previewKeys,
} from "@/lib/traits/ids";
import { externalDependencies, requiredPacks, resolveRef, type ResolveContext } from "@/lib/traits/resolver";
import type { TraitIssue, TraitValidation } from "@/lib/traits/validate";
import { exportTrait } from "@/lib/traits/export";
import { Badge, Btn, Chip, EmptyHint, Field, NumberInput, Panel, SelectInput, TextArea, TextInput, Toggle } from "./primitives";
import { RefField } from "./ResourcePicker";

export type Patch = (fn: (d: TraitDoc) => TraitDoc) => void;

export interface SectionProps {
  doc: TraitDoc;
  patch: Patch;
  ctx: ResolveContext;
  validation: TraitValidation;
  focus?: string | undefined;
}

const opts = <T extends string>(values: readonly T[], label?: (v: T) => string) =>
  values.map((v) => ({ value: v, label: label ? label(v) : v }));

/* ============================================================== identity == */

export function IdentitySection({ doc, patch }: SectionProps) {
  const spec = traitTypeSpec(doc.traitType);
  const [renameOpen, setRenameOpen] = useState(false);
  const suggested = sanitizeInternalName(doc.displayName);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel title="Basic information" subtitle="Names, namespace and description. Player-facing text is localized automatically.">
        <div className="space-y-3">
          <Field label="Trait name" hint="Shown in CAS, Simology, tooltips and rewards.">
            <TextInput
              value={doc.displayName}
              onChange={(e) =>
                patch((d) => ({
                  ...d,
                  displayName: e.target.value,
                  strings: { ...d.strings, displayName: { ...d.strings.displayName, text: e.target.value } },
                }))
              }
            />
          </Field>

          <Field
            label="Internal name"
            hint="Machine name used for tuning and hashing. Renaming the display name never changes it."
          >
            <div className="flex gap-1.5">
              <TextInput
                value={doc.ids.internalName}
                onChange={(e) => patch((d) => ({ ...d, ids: { ...d.ids, internalName: e.target.value } }))}
                className="font-mono"
              />
              <Btn
                icon={RefreshCw}
                onClick={() => setRenameOpen((v) => !v)}
                title="Regenerate internal name from the display name"
              >
                Regenerate
              </Btn>
            </div>
          </Field>

          {renameOpen && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-[11px]">
              <p className="mb-2">
                Rename <code className="font-mono">{doc.ids.internalName}</code> →{" "}
                <code className="font-mono">{suggested}</code>. This changes the tuning name and,
                unless you have pinned an ID, the generated instance too.
              </p>
              <div className="flex gap-1.5">
                <Btn
                  variant="primary"
                  onClick={() => {
                    patch((d) => ({ ...d, ids: { ...d.ids, internalName: suggested } }));
                    setRenameOpen(false);
                    toast.success("Internal name regenerated");
                  }}
                >
                  Apply
                </Btn>
                <Btn onClick={() => setRenameOpen(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          <Field label="Creator namespace" hint="Keeps your tuning names and hashes from colliding with other creators.">
            <TextInput
              value={doc.ids.namespace}
              onChange={(e) => patch((d) => ({ ...d, ids: { ...d.ids, namespace: e.target.value } }))}
              className="font-mono"
            />
          </Field>

          <Field label="Description" hint="Player-facing explanation. Gets its own string key.">
            <TextArea
              value={doc.description}
              onChange={(e) =>
                patch((d) => ({
                  ...d,
                  description: e.target.value,
                  strings: { ...d.strings, description: { ...d.strings.description, text: e.target.value } },
                }))
              }
            />
          </Field>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel title="Icon" subtitle="Upload, project asset, built-in library or an existing game icon.">
          <ImageField
            label="Trait icon"
            slot="icon"
            value={doc.icon}
            onChange={(v) => patch((d) => ({ ...d, icon: v }))}
            context={{ subject: doc.displayName, style: "Sims 4 trait icon" }}
          />
          <div className="mt-2 space-y-1 text-[10.5px] text-muted-foreground">
            {!doc.icon && isVisible(doc) && (
              <p className="text-amber-500">Visible traits should have an icon — CAS shows a blank slot otherwise.</p>
            )}
            <p>Exported as a PNG resource keyed to this trait.</p>
          </div>
        </Panel>

        <Panel title="Classification" subtitle="The type decides what the rest of the builder shows and how the trait exports.">
          <div className="space-y-3">
            <Field label="Trait type" hint={spec.blurb}>
              <SelectInput<TraitTypeId>
                value={doc.traitType}
                onChange={(v) =>
                  patch((d) => {
                    const s = traitTypeSpec(v);
                    return {
                      ...d,
                      traitType: v,
                      acquisition: {
                        ...d.acquisition,
                        methods: s.cas
                          ? d.acquisition.methods
                          : d.acquisition.methods.filter((m) => m !== "cas"),
                      },
                    };
                  })
                }
                options={TRAIT_TYPES.map((t) => ({ value: t.id, label: t.label }))}
              />
            </Field>

            {spec.usesCategory && (
              <Field label="CAS category">
                <SelectInput<TraitCategoryId>
                  value={doc.category}
                  onChange={(v) =>
                    patch((d) => ({ ...d, category: v, acquisition: { ...d.acquisition, cas: { ...d.acquisition.cas, category: v } } }))
                  }
                  options={opts(TRAIT_CATEGORIES)}
                />
              </Field>
            )}

            <Field label="Visibility" hint="Hidden traits still drive autonomy and affordances — they just show nothing.">
              <SelectInput<VisibilityId>
                value={doc.visibility}
                onChange={(v) => patch((d) => ({ ...d, visibility: v }))}
                options={VISIBILITY_OPTIONS.map((v) => ({ value: v.id, label: v.label }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              <Cap on={spec.cas} label="Appears in CAS" />
              <Cap on={spec.purchasable} label="Purchasable" />
              <Cap on={spec.simology} label="Shown in Simology" />
              <Cap on={isVisible(doc)} label="Visible" />
            </div>
            <p className="text-[10.5px] text-muted-foreground">
              Exports as <code className="font-mono">{spec.gameTraitType}</code> in both the tuning and its SimData.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const Cap = ({ on, label }: { on: boolean; label: string }) => (
  <span className={cn("flex items-center gap-1", on ? "text-emerald-500" : "text-muted-foreground")}>
    {on ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current" />}
    {label}
  </span>
);

/* =========================================================== eligibility == */

export function EligibilitySection({ doc, patch, ctx }: SectionProps) {
  const packs = useMemo(() => requiredPacks(doc, ctx), [doc, ctx]);
  const deps = useMemo(() => externalDependencies(doc), [doc]);

  const toggle = <T extends string>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Ages" subtitle="Compiles into real age tests on the trait, not a label.">
        <div className="flex flex-wrap gap-1.5">
          {AGES.map((a) => (
            <Chip
              key={a.id}
              active={doc.eligibility.ages.includes(a.id)}
              onClick={() =>
                patch((d) => ({ ...d, eligibility: { ...d.eligibility, ages: toggle<AgeId>(d.eligibility.ages, a.id) } }))
              }
            >
              {a.label}
            </Chip>
          ))}
        </div>
        {!doc.eligibility.ages.length && (
          <p className="mt-2 text-[10.5px] text-red-500">No ages selected — no Sim can hold this trait.</p>
        )}
      </Panel>

      <Panel title="Species" subtitle="Only species your installed packs support are offered.">
        <div className="flex flex-wrap gap-1.5">
          {SPECIES.map((s) => (
            <Chip
              key={s.id}
              active={doc.eligibility.species.includes(s.id)}
              onClick={() =>
                patch((d) => ({ ...d, eligibility: { ...d.eligibility, species: toggle<SpeciesId>(d.eligibility.species, s.id) } }))
              }
            >
              {s.label}
              {s.pack !== "BaseGame" && <span className="ml-1 opacity-60">{s.pack}</span>}
            </Chip>
          ))}
        </div>
      </Panel>

      <Panel title="Occult" subtitle="Include or exclude occult life states.">
        <div className="mb-2">
          <SelectInput
            value={doc.eligibility.occultMode}
            onChange={(v) => patch((d) => ({ ...d, eligibility: { ...d.eligibility, occultMode: v } }))}
            options={[
              { value: "any" as const, label: "Any Sim" },
              { value: "include" as const, label: "Include selected only" },
              { value: "exclude" as const, label: "Exclude selected" },
            ]}
          />
        </div>
        {doc.eligibility.occultMode !== "any" && (
          <div className="flex flex-wrap gap-1.5">
            {OCCULTS.map((o) => (
              <Chip
                key={o.id}
                active={doc.eligibility.occults.includes(o.id)}
                onClick={() =>
                  patch((d) => ({ ...d, eligibility: { ...d.eligibility, occults: toggle<OccultId>(d.eligibility.occults, o.id) } }))
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Gender" subtitle="Emitted as a gender test where the game supports one.">
        <SelectInput
          value={doc.eligibility.gender}
          onChange={(v) => patch((d) => ({ ...d, eligibility: { ...d.eligibility, gender: v } }))}
          options={[
            { value: "none" as const, label: "No restriction" },
            { value: "masculine-frame" as const, label: "Masculine frame" },
            { value: "feminine-frame" as const, label: "Feminine frame" },
            { value: "male" as const, label: "Male" },
            { value: "female" as const, label: "Female" },
            { value: "custom" as const, label: "Custom gender test" },
          ]}
        />
        {doc.eligibility.gender === "custom" && (
          <div className="mt-2">
            <TextInput
              placeholder="Custom test description"
              value={doc.eligibility.customGenderTest ?? ""}
              onChange={(e) => patch((d) => ({ ...d, eligibility: { ...d.eligibility, customGenderTest: e.target.value } }))}
            />
          </div>
        )}
      </Panel>

      <Panel title="Pack requirements" subtitle="Detected from every connected resource — you cannot claim base game while referencing pack content." className="lg:col-span-2">
        <div className="flex flex-wrap gap-1.5">
          {packs.length ? (
            packs.map((p) => <Badge key={p} tone="accent">{p}</Badge>)
          ) : (
            <Badge tone="ok">Base game only</Badge>
          )}
        </div>
        <div className="mt-3">
          <Toggle
            checked={doc.eligibility.claimsBaseGame}
            onChange={(v) => patch((d) => ({ ...d, eligibility: { ...d.eligibility, claimsBaseGame: v } }))}
            label="Advertise as base-game compatible"
            hint={packs.length ? `Blocked: this trait references ${packs.join(", ")}.` : "Nothing pack-specific is referenced."}
          />
        </div>
        {deps.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-[11px] font-semibold">External mods</p>
            {deps.map((d) => (
              <div key={`${d.creator}-${d.modName}`} className="text-[11px] text-muted-foreground">
                {d.modName} — {d.creator} {d.minVersion ? `≥ ${d.minVersion}` : ""}{" "}
                <Badge tone={d.required ? "warn" : "muted"}>{d.required ? "required" : "optional"}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* =============================================================== effects == */

const EFFECT_ORDER: EffectKind[] = [
  "buff",
  "motive",
  "skill",
  "statistic",
  "autonomy",
  "interaction-unlock",
  "interaction-restriction",
  "loot",
  "relationship",
  "emotional",
  "broadcaster",
  "appearance",
];

export function EffectsSection({ doc, patch, ctx, focus }: SectionProps) {
  const [open, setOpen] = useState<string | null>(doc.effects[0]?.id ?? null);
  const [adding, setAdding] = useState(false);

  const add = (kind: EffectKind) => {
    const e = makeEffect(kind);
    patch((d) => ({ ...d, effects: [...d.effects, e] }));
    setOpen(e.id);
    setAdding(false);
  };

  const update = (id: string, fn: (e: TraitEffect) => TraitEffect) =>
    patch((d) => ({ ...d, effects: d.effects.map((e) => (e.id === id ? fn(e) : e)) }));

  const remove = (id: string) => patch((d) => ({ ...d, effects: d.effects.filter((e) => e.id !== id) }));

  return (
    <div className="space-y-3">
      <Panel
        title="Effects"
        subtitle="Each effect is a real connected resource. Descriptions alone do nothing in-game."
        actions={<Btn icon={Plus} variant="primary" onClick={() => setAdding((v) => !v)}>Add effect</Btn>}
      >
        {adding && (
          <div className="mb-3 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {EFFECT_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => add(k)}
                className="rounded-md border border-border bg-background px-2.5 py-2 text-left text-[11.5px] font-medium hover:bg-muted"
              >
                {EFFECT_LABEL[k]}
              </button>
            ))}
          </div>
        )}

        {doc.effects.length === 0 ? (
          <EmptyHint>
            No effects yet. A trait with no effects exports cleanly but does nothing in-game.
          </EmptyHint>
        ) : (
          <div className="space-y-1.5">
            {doc.effects.map((e) => {
              const expanded = open === e.id || focus === e.id;
              const expects = EFFECT_EXPECTS[e.kind];
              const ref = "ref" in e ? e.ref : null;
              const res = ref ? resolveRef(ref, ctx) : null;
              return (
                <div key={e.id} className={cn("rounded-lg border bg-background", expanded ? "border-primary/40" : "border-border")}>
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <button type="button" onClick={() => setOpen(expanded ? null : e.id)} className="text-muted-foreground">
                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => setOpen(expanded ? null : e.id)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12px] font-semibold">{e.label}</span>
                        <Badge>{EFFECT_LABEL[e.kind]}</Badge>
                        {expects && !ref && <Badge tone="error">not connected</Badge>}
                        {res && res.status !== "ok" && <Badge tone="error">{res.status}</Badge>}
                        {!e.enabled && <Badge tone="muted">disabled</Badge>}
                      </div>
                      {ref && (
                        <div className="truncate font-mono text-[10px] text-muted-foreground">{ref.tuningName}</div>
                      )}
                    </button>
                    <Btn
                      onClick={() => update(e.id, (x) => ({ ...x, enabled: !x.enabled }) as TraitEffect)}
                      title={e.enabled ? "Disable" : "Enable"}
                    >
                      {e.enabled ? "On" : "Off"}
                    </Btn>
                    <Btn icon={Copy} title="Duplicate" onClick={() => patch((d) => ({ ...d, effects: [...d.effects, { ...e, id: `${e.id}_copy${Date.now().toString(36)}` }] }))}>
                      {""}
                    </Btn>
                    <Btn icon={Trash2} variant="danger" title="Remove" onClick={() => remove(e.id)}>
                      {""}
                    </Btn>
                  </div>

                  {expanded && (
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Label">
                          <TextInput value={e.label} onChange={(ev) => update(e.id, (x) => ({ ...x, label: ev.target.value }) as TraitEffect)} />
                        </Field>
                        <Field label="Condition" hint="When this effect applies. Compiled into a test on export.">
                          <TextInput value={e.condition} onChange={(ev) => update(e.id, (x) => ({ ...x, condition: ev.target.value }) as TraitEffect)} />
                        </Field>
                      </div>

                      {expects && (
                        <RefField
                          label={`Connected ${expects}`}
                          expects={expects}
                          value={ref}
                          onChange={(r) => update(e.id, (x) => ({ ...x, ref: r }) as TraitEffect)}
                          {...(res ? { status: { status: res.status, ...(res.message ? { message: res.message } : {}) } } : {})}
                        />
                      )}

                      <EffectFields effect={e} update={(fn) => update(e.id, fn)} />

                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Age override
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {AGES.map((a) => (
                            <Chip
                              key={a.id}
                              active={e.ages.includes(a.id)}
                              onClick={() =>
                                update(e.id, (x) => ({
                                  ...x,
                                  ages: x.ages.includes(a.id) ? x.ages.filter((y) => y !== a.id) : [...x.ages, a.id],
                                }) as TraitEffect)
                              }
                            >
                              {a.label}
                            </Chip>
                          ))}
                        </div>
                        <p className="mt-1 text-[10.5px] text-muted-foreground">
                          Empty = inherits the trait's ages ({doc.eligibility.ages.join(", ") || "none"}).
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function EffectFields({ effect, update }: { effect: TraitEffect; update: (fn: (e: TraitEffect) => TraitEffect) => void }) {
  const set = <K extends string>(key: K, value: unknown) =>
    update((e) => ({ ...(e as unknown as Record<string, unknown>), [key]: value }) as unknown as TraitEffect);

  switch (effect.kind) {
    case "buff":
      return (
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Mode">
            <SelectInput
              value={effect.mode}
              onChange={(v) => set("mode", v)}
              options={[
                { value: "persistent-hidden" as const, label: "Persistent hidden" },
                { value: "conditional" as const, label: "Conditional" },
                { value: "visible" as const, label: "Visible moodlet" },
              ]}
            />
          </Field>
          <Field label="Mood">
            <TextInput value={effect.mood} onChange={(e) => set("mood", e.target.value)} />
          </Field>
          <Field label="Mood weight">
            <NumberInput value={effect.moodWeight} onChange={(v) => set("moodWeight", v)} />
          </Field>
          <Field label="Duration (h)" hint="0 = lasts while the trait is held.">
            <NumberInput value={effect.durationHours} onChange={(v) => set("durationHours", v)} />
          </Field>
        </div>
      );
    case "motive":
      return (
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Operation">
            <SelectInput
              value={effect.operation}
              onChange={(v) => set("operation", v)}
              options={[
                { value: "decay-multiplier" as const, label: "Decay multiplier" },
                { value: "gain-multiplier" as const, label: "Gain multiplier" },
                { value: "add" as const, label: "Additive" },
                { value: "set-max" as const, label: "Set maximum" },
                { value: "set-min" as const, label: "Set minimum" },
              ]}
            />
          </Field>
          <Field label="Value"><NumberInput step={0.05} value={effect.value} onChange={(v) => set("value", v)} /></Field>
          <Field label="Min"><NumberInput value={effect.min ?? 0} onChange={(v) => set("min", v)} /></Field>
          <Field label="Max"><NumberInput value={effect.max ?? 0} onChange={(v) => set("max", v)} /></Field>
        </div>
      );
    case "skill":
      return (
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Gain multiplier"><NumberInput step={0.05} value={effect.gainMultiplier} onChange={(v) => set("gainMultiplier", v)} /></Field>
          <Field label="Decay multiplier"><NumberInput step={0.05} value={effect.decayMultiplier} onChange={(v) => set("decayMultiplier", v)} /></Field>
          <Field label="Min level"><NumberInput value={effect.minLevel ?? 0} onChange={(v) => set("minLevel", v)} /></Field>
          <Field label="Max level"><NumberInput value={effect.maxLevel ?? 0} onChange={(v) => set("maxLevel", v)} /></Field>
        </div>
      );
    case "statistic":
      return (
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Operation">
            <SelectInput
              value={effect.operation}
              onChange={(v) => set("operation", v)}
              options={[
                { value: "add" as const, label: "Add" },
                { value: "multiply" as const, label: "Multiply" },
                { value: "set" as const, label: "Set" },
                { value: "clamp" as const, label: "Clamp" },
              ]}
            />
          </Field>
          <Field label="Value"><NumberInput step={0.1} value={effect.value} onChange={(v) => set("value", v)} /></Field>
          <Field label="Min"><NumberInput value={effect.min ?? 0} onChange={(v) => set("min", v)} /></Field>
          <Field label="Max"><NumberInput value={effect.max ?? 0} onChange={(v) => set("max", v)} /></Field>
        </div>
      );
    case "autonomy":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Mode" hint="Encourage, discourage, hard block, or advertise a commodity.">
              <SelectInput
                value={effect.mode}
                onChange={(v) => set("mode", v)}
                options={[
                  { value: "encourage" as const, label: "Encourage autonomy" },
                  { value: "discourage" as const, label: "Discourage autonomy" },
                  { value: "block" as const, label: "Never autonomously" },
                  { value: "advertise" as const, label: "Advertise commodity" },
                ]}
              />
            </Field>
            <Field label="Score multiplier"><NumberInput step={0.1} value={effect.scoreMultiplier} onChange={(v) => set("scoreMultiplier", v)} /></Field>
            <Field label="Score bonus"><NumberInput value={effect.scoreBonus} onChange={(v) => set("scoreBonus", v)} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Target"><TextInput value={effect.targetFilter} onChange={(e) => set("targetFilter", e.target.value)} /></Field>
            <Field label="Location"><TextInput value={effect.locationFilter} onChange={(e) => set("locationFilter", e.target.value)} /></Field>
            <Field label="Time"><TextInput value={effect.timeFilter} onChange={(e) => set("timeFilter", e.target.value)} /></Field>
            <Field label="Situation"><TextInput value={effect.situationFilter} onChange={(e) => set("situationFilter", e.target.value)} /></Field>
          </div>
        </div>
      );
    case "interaction-unlock":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Target">
            <SelectInput
              value={effect.target}
              onChange={(v) => set("target", v)}
              options={[
                { value: "sim" as const, label: "Sim" },
                { value: "object" as const, label: "Object" },
                { value: "phone" as const, label: "Phone" },
                { value: "computer" as const, label: "Computer" },
                { value: "mailbox" as const, label: "Mailbox" },
                { value: "terrain" as const, label: "Terrain" },
                { value: "pie-menu" as const, label: "Pie-menu category" },
              ]}
            />
          </Field>
          <Field label="Pie-menu category"><TextInput value={effect.pieMenuCategory} onChange={(e) => set("pieMenuCategory", e.target.value)} /></Field>
          <div className="flex items-end">
            <Toggle
              checked={effect.requiresInjection}
              onChange={(v) => set("requiresInjection", v)}
              label="Requires injection"
              hint="Needs a snippet or script to attach to an existing object."
            />
          </div>
        </div>
      );
    case "interaction-restriction":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rule">
            <SelectInput
              value={effect.rule}
              onChange={(v) => set("rule", v)}
              options={[
                { value: "satisfy-test" as const, label: "Satisfy a trait test" },
                { value: "fail-test" as const, label: "Fail a trait test" },
                { value: "unlock" as const, label: "Unlock interaction" },
                { value: "hide" as const, label: "Hide interaction" },
                { value: "disable" as const, label: "Disable interaction" },
                { value: "change-outcome" as const, label: "Change outcome" },
                { value: "modify-speed" as const, label: "Modify speed" },
                { value: "modify-success" as const, label: "Modify success" },
                { value: "alternate-loot" as const, label: "Apply alternate loot" },
              ]}
            />
          </Field>
          <Field label="Value" hint="Multiplier or delta, depending on the rule.">
            <NumberInput step={0.1} value={effect.value} onChange={(v) => set("value", v)} />
          </Field>
        </div>
      );
    case "loot":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Trigger">
            <SelectInput
              value={effect.trigger}
              onChange={(v) => set("trigger", v)}
              options={[
                { value: "trait-added" as const, label: "When trait is added" },
                { value: "trait-removed" as const, label: "When trait is removed" },
                { value: "sim-init" as const, label: "On Sim initialization" },
                { value: "zone-load" as const, label: "On zone load" },
                { value: "interaction-complete" as const, label: "On interaction complete" },
                { value: "broadcaster" as const, label: "From a broadcaster" },
                { value: "custom-event" as const, label: "Custom event" },
              ]}
            />
          </Field>
          <Field label="Action">
            <SelectInput
              value={effect.action}
              onChange={(v) => set("action", v)}
              options={[
                { value: "add-buff" as const, label: "Add buff" },
                { value: "remove-buff" as const, label: "Remove buff" },
                { value: "add-trait" as const, label: "Add trait" },
                { value: "remove-trait" as const, label: "Remove trait" },
                { value: "modify-statistic" as const, label: "Modify statistic" },
                { value: "modify-relationship" as const, label: "Modify relationship" },
                { value: "give-object" as const, label: "Give object" },
                { value: "remove-object" as const, label: "Remove object" },
                { value: "notification" as const, label: "Send notification" },
                { value: "unlock-interaction" as const, label: "Unlock interaction" },
                { value: "tested-outcome" as const, label: "Apply tested outcome" },
                { value: "run-loot-list" as const, label: "Run loot list" },
              ]}
            />
          </Field>
          <Field label="Amount"><NumberInput value={effect.amount} onChange={(v) => set("amount", v)} /></Field>
        </div>
      );
    case "relationship":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Track">
            <SelectInput
              value={effect.track}
              onChange={(v) => set("track", v)}
              options={[
                { value: "friendship-gain" as const, label: "Friendship gain" },
                { value: "friendship-loss" as const, label: "Friendship loss" },
                { value: "romance-gain" as const, label: "Romance gain" },
                { value: "romance-loss" as const, label: "Romance loss" },
                { value: "decay" as const, label: "Relationship decay" },
                { value: "sentiment" as const, label: "Sentiment eligibility" },
                { value: "social-compatibility" as const, label: "Social compatibility" },
                { value: "relationship-bit" as const, label: "Relationship bit" },
              ]}
            />
          </Field>
          <Field label="Multiplier"><NumberInput step={0.05} value={effect.multiplier} onChange={(v) => set("multiplier", v)} /></Field>
        </div>
      );
    case "emotional":
      return (
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Emotion"><TextInput value={effect.emotion} onChange={(e) => set("emotion", e.target.value)} /></Field>
          <Field label="Intensity"><NumberInput value={effect.intensity} onChange={(v) => set("intensity", v)} /></Field>
          <Field label="Autonomy shift"><NumberInput step={0.1} value={effect.autonomyShift} onChange={(v) => set("autonomyShift", v)} /></Field>
          <div className="flex items-end">
            <Toggle checked={effect.permanent} onChange={(v) => set("permanent", v)} label="Permanent" hint="Most traits should leave this off." />
          </div>
        </div>
      );
    case "broadcaster":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Radius"><NumberInput value={effect.radius} onChange={(v) => set("radius", v)} /></Field>
            <Field label="Period (min)"><NumberInput value={effect.periodMinutes} onChange={(v) => set("periodMinutes", v)} /></Field>
            <Field label="Target filter"><TextInput value={effect.targetFilter} onChange={(e) => set("targetFilter", e.target.value)} /></Field>
            <Field label="Venue / zone"><TextInput value={effect.venueFilter} onChange={(e) => set("venueFilter", e.target.value)} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RefField label="Applied buff" expects="Buff" value={effect.buffRef} onChange={(r) => set("buffRef", r)} />
            <RefField label="Periodic loot" expects="Loot" value={effect.lootRef} onChange={(r) => set("lootRef", r)} />
          </div>
          <Toggle checked={effect.requiresLineOfSight} onChange={(v) => set("requiresLineOfSight", v)} label="Requires line of sight" />
        </div>
      );
    case "appearance":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Feature">
            <SelectInput
              value={effect.feature}
              onChange={(v) => set("feature", v)}
              options={[
                { value: "cas-part" as const, label: "CAS part" },
                { value: "overlay" as const, label: "Occult overlay" },
                { value: "walkstyle" as const, label: "Walk style" },
                { value: "voice" as const, label: "Voice effect" },
                { value: "vfx" as const, label: "Visual effect" },
                { value: "animation" as const, label: "Animation reference" },
              ]}
            />
          </Field>
          <Field label="Value"><TextInput value={effect.value} onChange={(e) => set("value", e.target.value)} /></Field>
        </div>
      );
  }
}

/* =========================================================== acquisition == */

const METHODS = Object.keys(ACQUISITION_LABEL) as AcquisitionMethod[];

export function AcquisitionSection({ doc, patch }: SectionProps) {
  const spec = traitTypeSpec(doc.traitType);
  const a = doc.acquisition;
  const setA = (fn: (x: typeof a) => typeof a) => patch((d) => ({ ...d, acquisition: fn(d.acquisition) }));

  return (
    <div className="space-y-4">
      <Panel title="Acquisition methods" subtitle="How a Sim can end up with this trait.">
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map((m) => {
            const disabled = m === "cas" && !spec.cas;
            return (
              <Chip
                key={m}
                active={a.methods.includes(m)}
                onClick={() =>
                  disabled
                    ? toast.error(`${spec.label} traits cannot be selected in CAS.`)
                    : setA((x) => ({
                        ...x,
                        methods: x.methods.includes(m) ? x.methods.filter((y) => y !== m) : [...x.methods, m],
                      }))
                }
              >
                {ACQUISITION_LABEL[m]}
              </Chip>
            );
          })}
        </div>
      </Panel>

      {a.methods.includes("reward-store") && (
        <Panel title="Reward store" subtitle="Points at this same trait — no duplicate is created.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Satisfaction cost"><NumberInput value={a.rewardStore.cost} onChange={(v) => setA((x) => ({ ...x, rewardStore: { ...x.rewardStore, cost: v } }))} /></Field>
            <Field label="Store name" hint="Blank = trait display name.">
              <TextInput value={a.rewardStore.name} onChange={(e) => setA((x) => ({ ...x, rewardStore: { ...x.rewardStore, name: e.target.value } }))} />
            </Field>
            <Field label="Display order"><NumberInput value={a.rewardStore.displayOrder} onChange={(v) => setA((x) => ({ ...x, rewardStore: { ...x.rewardStore, displayOrder: v } }))} /></Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Store description">
              <TextArea
                value={a.rewardStore.description}
                onChange={(e) =>
                  patch((d) => ({
                    ...d,
                    acquisition: { ...d.acquisition, rewardStore: { ...d.acquisition.rewardStore, description: e.target.value } },
                    strings: { ...d.strings, rewardStoreDescription: { ...d.strings.rewardStoreDescription, text: e.target.value } },
                  }))
                }
              />
            </Field>
            <Field label="Eligibility tests">
              <TextArea value={a.rewardStore.tests} onChange={(e) => setA((x) => ({ ...x, rewardStore: { ...x.rewardStore, tests: e.target.value } }))} />
            </Field>
          </div>
          <div className="mt-3">
            <Toggle
              checked={a.rewardStore.hiddenUntilUnlocked}
              onChange={(v) => setA((x) => ({ ...x, rewardStore: { ...x.rewardStore, hiddenUntilUnlocked: v } }))}
              label="Hidden until unlocked"
            />
          </div>
          <div className="mt-3">
            <RefList
              label="Mutually exclusive traits"
              expects="Trait"
              value={a.rewardStore.mutuallyExclusive}
              onChange={(refs) => setA((x) => ({ ...x, rewardStore: { ...x.rewardStore, mutuallyExclusive: refs } }))}
            />
          </div>
        </Panel>
      )}

      {a.methods.includes("cas") && spec.cas && (
        <Panel title="CAS settings">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category">
              <SelectInput<TraitCategoryId>
                value={a.cas.category}
                onChange={(v) => setA((x) => ({ ...x, cas: { ...x.cas, category: v } }))}
                options={opts(TRAIT_CATEGORIES)}
              />
            </Field>
            <Field label="Display order"><NumberInput value={a.cas.displayOrder} onChange={(v) => setA((x) => ({ ...x, cas: { ...x.cas, displayOrder: v } }))} /></Field>
            <Field label="Slot behaviour">
              <SelectInput
                value={a.cas.maxSelectionBehavior}
                onChange={(v) => setA((x) => ({ ...x, cas: { ...x.cas, maxSelectionBehavior: v } }))}
                options={[
                  { value: "counts-toward-limit" as const, label: "Counts toward trait limit" },
                  { value: "free-slot" as const, label: "Does not count (free slot)" },
                ]}
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Toggle checked={a.cas.randomGeneration} onChange={(v) => setA((x) => ({ ...x, cas: { ...x.cas, randomGeneration: v } }))} label="Random generation" />
            <Toggle checked={a.cas.townieGeneration} onChange={(v) => setA((x) => ({ ...x, cas: { ...x.cas, townieGeneration: v } }))} label="Townie generation" />
            <Toggle checked={a.cas.storyProgression} onChange={(v) => setA((x) => ({ ...x, cas: { ...x.cas, storyProgression: v } }))} label="Story progression" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <RefList label="Conflicting traits" expects="Trait" value={a.cas.conflicts} onChange={(refs) => setA((x) => ({ ...x, cas: { ...x.cas, conflicts: refs } }))} />
            <RefList label="Required traits" expects="Trait" value={a.cas.requires} onChange={(refs) => setA((x) => ({ ...x, cas: { ...x.cas, requires: refs } }))} />
          </div>
        </Panel>
      )}

      <Panel title="Granted by" subtitle="Aspirations, careers, interactions or events that award the trait.">
        <RefList label="Award sources" expects="Aspiration" value={a.grantedBy} onChange={(refs) => setA((x) => ({ ...x, grantedBy: refs }))} allowKinds={["Aspiration", "Career", "Interaction", "Loot"]} />
      </Panel>

      <Panel title="Removal">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle checked={a.removal.retraitingPotion} onChange={(v) => setA((x) => ({ ...x, removal: { ...x.removal, retraitingPotion: v } }))} label="Removable with re-traiting potion" />
          <Toggle checked={a.removal.byLoot} onChange={(v) => setA((x) => ({ ...x, removal: { ...x.removal, byLoot: v } }))} label="Removable by loot" />
          <Toggle checked={a.removal.byInteraction} onChange={(v) => setA((x) => ({ ...x, removal: { ...x.removal, byInteraction: v } }))} label="Removable by interaction" />
          <Toggle checked={a.removal.neverRemovable} onChange={(v) => setA((x) => ({ ...x, removal: { ...x.removal, neverRemovable: v } }))} label="Never removable in normal gameplay" />
          <Toggle checked={a.removal.removeConnectedBuffs} onChange={(v) => setA((x) => ({ ...x, removal: { ...x.removal, removeConnectedBuffs: v } }))} label="Remove connected buffs on removal" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RefField label="Loot to run on removal" expects="Loot" value={a.removal.runLootOnRemove} onChange={(r) => setA((x) => ({ ...x, removal: { ...x.removal, runLootOnRemove: r } }))} />
          <Field label="Connected statistics">
            <SelectInput
              value={a.removal.statisticPolicy}
              onChange={(v) => setA((x) => ({ ...x, removal: { ...x.removal, statisticPolicy: v } }))}
              options={[
                { value: "preserve" as const, label: "Preserve values" },
                { value: "reset" as const, label: "Reset to default" },
              ]}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

function RefList({
  label,
  expects,
  value,
  onChange,
  allowKinds,
}: {
  label: string;
  expects: Parameters<typeof RefField>[0]["expects"];
  value: import("@/lib/traits/schema").ResourceRef[];
  onChange: (refs: import("@/lib/traits/schema").ResourceRef[]) => void;
  allowKinds?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {value.map((r, i) => (
        <div key={`${r.tuningName}-${i}`} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[11.5px]">{r.label || r.tuningName}</span>
          <Badge>{r.resourceKind}</Badge>
          <Btn icon={Trash2} variant="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>{""}</Btn>
        </div>
      ))}
      <RefField
        label=""
        expects={expects}
        value={null}
        onChange={(r) => r && onChange([...value, r])}
        {...(allowKinds ? { hint: `Accepts: ${allowKinds.join(", ")}` } : {})}
      />
    </div>
  );
}

/* ============================================================= conflicts == */

export function ConflictsSection({ doc, patch }: SectionProps) {
  return (
    <div className="space-y-4">
      <Panel
        title="Trait conflicts"
        subtitle="What happens when a Sim would hold this trait and a conflicting one."
        actions={<Btn icon={Plus} onClick={() => patch((d) => ({ ...d, conflicts: [...d.conflicts, makeConflict()] }))}>Add conflict</Btn>}
      >
        {doc.conflicts.length === 0 ? (
          <EmptyHint>No conflicts. This trait can coexist with anything.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {doc.conflicts.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-background p-2.5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Match">
                    <SelectInput
                      value={c.matchKind}
                      onChange={(v) => patch((d) => ({ ...d, conflicts: d.conflicts.map((x) => (x.id === c.id ? { ...x, matchKind: v } : x)) }))}
                      options={[
                        { value: "trait" as const, label: "Specific trait" },
                        { value: "category" as const, label: "Trait category" },
                        { value: "tag" as const, label: "Trait tag" },
                      ]}
                    />
                  </Field>
                  <Field label="Behaviour">
                    <SelectInput
                      value={c.behavior}
                      onChange={(v) => patch((d) => ({ ...d, conflicts: d.conflicts.map((x) => (x.id === c.id ? { ...x, behavior: v } : x)) }))}
                      options={[
                        { value: "cannot-coexist" as const, label: "Cannot coexist" },
                        { value: "remove-old" as const, label: "Remove the old trait" },
                        { value: "prevent-new" as const, label: "Prevent the new trait" },
                        { value: "warn-only" as const, label: "Warning only" },
                        { value: "suppress-effects" as const, label: "Coexist, suppress effects" },
                      ]}
                    />
                  </Field>
                  <div className="flex items-end justify-end">
                    <Btn icon={Trash2} variant="danger" onClick={() => patch((d) => ({ ...d, conflicts: d.conflicts.filter((x) => x.id !== c.id) }))}>Remove</Btn>
                  </div>
                </div>
                <div className="mt-2">
                  {c.matchKind === "trait" ? (
                    <RefField
                      label="Conflicting trait"
                      expects="Trait"
                      value={c.ref}
                      onChange={(r) => patch((d) => ({ ...d, conflicts: d.conflicts.map((x) => (x.id === c.id ? { ...x, ref: r } : x)) }))}
                    />
                  ) : (
                    <Field label={c.matchKind === "category" ? "Category" : "Tag"}>
                      <TextInput
                        value={c.matchValue}
                        onChange={(e) => patch((d) => ({ ...d, conflicts: d.conflicts.map((x) => (x.id === c.id ? { ...x, matchValue: e.target.value } : x)) }))}
                      />
                    </Field>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Requirements"
        subtitle="Conditions a Sim must satisfy. Each row exports as a reusable test set."
        actions={<Btn icon={Plus} onClick={() => patch((d) => ({ ...d, requirements: [...d.requirements, makeRequirement()] }))}>Add requirement</Btn>}
      >
        {doc.requirements.length === 0 ? (
          <EmptyHint>No requirements — any eligible Sim can receive this trait.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {doc.requirements.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-background p-2.5">
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Kind">
                    <SelectInput
                      value={r.kind}
                      onChange={(v) => patch((d) => ({ ...d, requirements: d.requirements.map((x) => (x.id === r.id ? { ...x, kind: v } : x)) }))}
                      options={[
                        { value: "must-have-trait" as const, label: "Must have trait" },
                        { value: "must-not-have-trait" as const, label: "Must not have trait" },
                        { value: "any-of-group" as const, label: "Any trait from group" },
                        { value: "all-of-group" as const, label: "All selected traits" },
                        { value: "skill-level" as const, label: "Skill level" },
                        { value: "age" as const, label: "Age" },
                        { value: "occult" as const, label: "Occult" },
                        { value: "career" as const, label: "Career" },
                        { value: "aspiration" as const, label: "Aspiration" },
                        { value: "relationship" as const, label: "Relationship" },
                        { value: "statistic-threshold" as const, label: "Statistic threshold" },
                        { value: "custom-test-set" as const, label: "Custom test set" },
                      ]}
                    />
                  </Field>
                  <Field label="Value"><TextInput value={r.value} onChange={(e) => patch((d) => ({ ...d, requirements: d.requirements.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)) }))} /></Field>
                  <Field label="Threshold"><NumberInput value={r.threshold} onChange={(v) => patch((d) => ({ ...d, requirements: d.requirements.map((x) => (x.id === r.id ? { ...x, threshold: v } : x)) }))} /></Field>
                  <div className="flex items-end justify-end">
                    <Btn icon={Trash2} variant="danger" onClick={() => patch((d) => ({ ...d, requirements: d.requirements.filter((x) => x.id !== r.id) }))}>Remove</Btn>
                  </div>
                </div>
                {["must-have-trait", "must-not-have-trait", "any-of-group", "all-of-group"].includes(r.kind) && (
                  <div className="mt-2">
                    <RefList
                      label="Traits"
                      expects="Trait"
                      value={r.refs}
                      onChange={(refs) => patch((d) => ({ ...d, requirements: d.requirements.map((x) => (x.id === r.id ? { ...x, refs } : x)) }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Trait compatibility matrix"
        subtitle="Generates the social-compatibility tests and modifiers behind the scenes."
        actions={<Btn icon={Plus} onClick={() => patch((d) => ({ ...d, compatibility: [...d.compatibility, makeCompatibility()] }))}>Add row</Btn>}
      >
        {doc.compatibility.length === 0 ? (
          <EmptyHint>No compatibility rules yet.</EmptyHint>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-semibold">This trait</th>
                <th className="py-1 text-left font-semibold">Other trait</th>
                <th className="py-1 text-left font-semibold">Result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {doc.compatibility.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-1.5 pr-2">{doc.displayName}</td>
                  <td className="py-1.5 pr-2">
                    <div className="max-w-xs">
                      <RefField
                        label=""
                        expects="Trait"
                        value={c.otherRef}
                        onChange={(r) => patch((d) => ({ ...d, compatibility: d.compatibility.map((x) => (x.id === c.id ? { ...x, otherRef: r, otherLabel: r?.label ?? "" } : x)) }))}
                      />
                    </div>
                  </td>
                  <td className="py-1.5 pr-2">
                    <SelectInput
                      value={c.result}
                      onChange={(v) => patch((d) => ({ ...d, compatibility: d.compatibility.map((x) => (x.id === c.id ? { ...x, result: v } : x)) }))}
                      options={[
                        { value: "strong-negative" as const, label: "Strong negative" },
                        { value: "negative" as const, label: "Negative" },
                        { value: "neutral" as const, label: "Neutral" },
                        { value: "positive" as const, label: "Positive" },
                        { value: "strong-positive" as const, label: "Strong positive" },
                      ]}
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <Btn icon={Trash2} variant="danger" onClick={() => patch((d) => ({ ...d, compatibility: d.compatibility.filter((x) => x.id !== c.id) }))}>{""}</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* ============================================================= reactions == */

export function ReactionsSection({ doc, patch }: SectionProps) {
  const upd = (id: string, fn: (r: import("@/lib/traits/schema").TraitReaction) => import("@/lib/traits/schema").TraitReaction) =>
    patch((d) => ({ ...d, reactions: d.reactions.map((r) => (r.id === id ? fn(r) : r)) }));

  return (
    <Panel
      title="Reactions"
      subtitle="How a Sim with this trait responds to the world."
      actions={<Btn icon={Plus} onClick={() => patch((d) => ({ ...d, reactions: [...d.reactions, makeReaction()] }))}>Add reaction</Btn>}
    >
      {doc.reactions.length === 0 ? (
        <EmptyHint>No reactions configured.</EmptyHint>
      ) : (
        <div className="space-y-2">
          {doc.reactions.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-background p-2.5">
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Label"><TextInput value={r.label} onChange={(e) => upd(r.id, (x) => ({ ...x, label: e.target.value }))} /></Field>
                <Field label="Trigger">
                  <SelectInput
                    value={r.trigger}
                    onChange={(v) => upd(r.id, (x) => ({ ...x, trigger: v }))}
                    options={[
                      { value: "trait" as const, label: "Trait" },
                      { value: "buff" as const, label: "Buff" },
                      { value: "emotion" as const, label: "Emotion" },
                      { value: "interaction" as const, label: "Interaction" },
                      { value: "object" as const, label: "Object" },
                      { value: "career" as const, label: "Career" },
                      { value: "occult" as const, label: "Occult" },
                      { value: "event" as const, label: "Event" },
                      { value: "nearby-sim" as const, label: "Nearby Sim" },
                      { value: "environment" as const, label: "Environment" },
                    ]}
                  />
                </Field>
                <Field label="Actor">
                  <SelectInput
                    value={r.actor}
                    onChange={(v) => upd(r.id, (x) => ({ ...x, actor: v }))}
                    options={[
                      { value: "self" as const, label: "This Sim" },
                      { value: "target" as const, label: "Target Sim" },
                      { value: "both" as const, label: "Both" },
                      { value: "nearby" as const, label: "Nearby Sims" },
                    ]}
                  />
                </Field>
                <Field label="Target"><TextInput value={r.target} onChange={(e) => upd(r.id, (x) => ({ ...x, target: e.target.value }))} /></Field>
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-4">
                <Field label="Conditions"><TextInput value={r.conditions} onChange={(e) => upd(r.id, (x) => ({ ...x, conditions: e.target.value }))} /></Field>
                <Field label="Cooldown (h)"><NumberInput value={r.cooldownHours} onChange={(v) => upd(r.id, (x) => ({ ...x, cooldownHours: v }))} /></Field>
                <Field label="Frequency">
                  <SelectInput
                    value={r.frequency}
                    onChange={(v) => upd(r.id, (x) => ({ ...x, frequency: v }))}
                    options={[
                      { value: "always" as const, label: "Always" },
                      { value: "often" as const, label: "Often" },
                      { value: "sometimes" as const, label: "Sometimes" },
                      { value: "rare" as const, label: "Rare" },
                    ]}
                  />
                </Field>
                <Field label="Priority"><NumberInput value={r.priority} onChange={(v) => upd(r.id, (x) => ({ ...x, priority: v }))} /></Field>
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <RefField label="Trigger resource" expects={r.trigger === "buff" ? "Buff" : r.trigger === "interaction" ? "Interaction" : "Trait"} value={r.triggerRef} onChange={(v) => upd(r.id, (x) => ({ ...x, triggerRef: v }))} />
                <RefField label="Apply buff" expects="Buff" value={r.outcomes.buffRef} onChange={(v) => upd(r.id, (x) => ({ ...x, outcomes: { ...x.outcomes, buffRef: v } }))} />
                <RefField label="Run loot" expects="Loot" value={r.outcomes.lootRef} onChange={(v) => upd(r.id, (x) => ({ ...x, outcomes: { ...x.outcomes, lootRef: v } }))} />
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <Toggle checked={r.outcomes.animation} onChange={(v) => upd(r.id, (x) => ({ ...x, outcomes: { ...x.outcomes, animation: v } }))} label="Play animation" />
                <Toggle checked={r.outcomes.notification} onChange={(v) => upd(r.id, (x) => ({ ...x, outcomes: { ...x.outcomes, notification: v } }))} label="Show notification" />
                <Toggle checked={r.outcomes.thoughtBalloon} onChange={(v) => upd(r.id, (x) => ({ ...x, outcomes: { ...x.outcomes, thoughtBalloon: v } }))} label="Thought balloon" />
                <Toggle checked={r.outcomes.vfx} onChange={(v) => upd(r.id, (x) => ({ ...x, outcomes: { ...x.outcomes, vfx: v } }))} label="Visual / audio effect" />
              </div>

              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="w-40">
                  <Field label="Relationship delta"><NumberInput value={r.outcomes.relationshipDelta} onChange={(v) => upd(r.id, (x) => ({ ...x, outcomes: { ...x.outcomes, relationshipDelta: v } }))} /></Field>
                </div>
                <Btn icon={Trash2} variant="danger" onClick={() => patch((d) => ({ ...d, reactions: d.reactions.filter((x) => x.id !== r.id) }))}>Remove reaction</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* =============================================================== strings == */

export function StringsSection({ doc, patch }: SectionProps) {
  const strings = ensureStringKeys(doc);
  const orphans = orphanStrings(doc);
  const fields = ALL_STRING_FIELDS(strings);

  const setField = (field: string, value: string) =>
    patch((d) => {
      const next = { ...d.strings };
      const map: Record<string, keyof typeof next> = {
        display_name: "displayName",
        description: "description",
        acquisition_notification: "acquisitionNotification",
        removal_notification: "removalNotification",
        reward_store_description: "rewardStoreDescription",
        conflict_warning: "conflictWarning",
        unlock_message: "unlockMessage",
      };
      const key = map[field];
      if (key && key !== "extra") {
        (next[key] as { text: string; field: string; key: string }) = {
          ...(next[key] as { text: string; field: string; key: string }),
          text: value,
        };
      } else {
        next.extra = next.extra.map((t) => (t.field === field ? { ...t, text: value } : t));
      }
      return {
        ...d,
        strings: next,
        ...(field === "display_name" ? { displayName: value } : {}),
        ...(field === "description" ? { description: value } : {}),
      };
    });

  return (
    <Panel title="Localized text" subtitle="Keys are stable: rewording never breaks existing translations or references.">
      <div className="space-y-2">
        {fields.map((t) => (
          <div key={t.field} className="rounded-lg border border-border bg-background p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t.field.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-[10px] text-muted-foreground">0x{t.key}</code>
                {orphans.some((o) => o.field === t.field) && <Badge tone="warn">orphaned</Badge>}
              </div>
            </div>
            <TextArea rows={2} value={t.text} onChange={(e) => setField(t.field, e.target.value)} />
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              Used by: {(STRING_USAGE[t.field] ?? ["Custom field"]).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ============================================================ validation == */

export function ValidationSection({
  doc,
  validation,
  onJump,
}: SectionProps & { onJump: (issue: TraitIssue) => void }) {
  const groups: { level: TraitIssue["level"]; title: string; tone: "error" | "warn" | "muted" }[] = [
    { level: "error", title: "Blocking errors", tone: "error" },
    { level: "warning", title: "Warnings", tone: "warn" },
    { level: "suggestion", title: "Suggestions", tone: "muted" },
  ];

  return (
    <div className="space-y-4">
      <Panel title="Validation" subtitle="Can this trait be exported, loaded, acquired, displayed and used without broken references?">
        <div className="flex flex-wrap gap-2">
          <Badge tone={validation.errors ? "error" : "ok"}>{validation.errors} errors</Badge>
          <Badge tone={validation.warnings ? "warn" : "ok"}>{validation.warnings} warnings</Badge>
          <Badge tone="muted">{validation.suggestions} suggestions</Badge>
          <Badge tone={validation.exportable ? "ok" : "error"}>
            {validation.exportable ? "Exportable" : "Export blocked"}
          </Badge>
        </div>
        {validation.issues.length === 0 && (
          <p className="mt-3 text-[11.5px] text-emerald-500">Everything checks out. Nothing is broken.</p>
        )}
      </Panel>

      {groups.map((g) => {
        const items = validation.issues.filter((i) => i.level === g.level);
        if (!items.length) return null;
        return (
          <Panel key={g.level} title={g.title}>
            <div className="space-y-1">
              {items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onJump(i)}
                  className="flex w-full items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:bg-muted/60"
                >
                  {g.tone === "error" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  ) : g.tone === "warn" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-[11.5px]">{i.message}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {i.code} → {i.section}
                      {i.target ? `.${i.target}` : ""}
                    </span>
                    {i.fix && <span className="block text-[10.5px] text-primary">{i.fix}</span>}
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        );
      })}
      <p className="text-[10.5px] text-muted-foreground">
        Validation covers references, ids, classification and configuration. It cannot prove the mod
        behaves correctly in a live game — test the package too.
      </p>
      <span className="hidden">{doc.ids.uuid}</span>
    </div>
  );
}

/* =============================================================== preview == */

export function PreviewSection({ doc }: SectionProps) {
  const spec = traitTypeSpec(doc.traitType);
  const visible = isVisible(doc);
  const buffs = doc.effects.filter((e) => e.kind === "buff" && e.enabled);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
        These are visual simulations of the in-game surfaces. They are not proof that the exported
        mod loads or behaves correctly.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="CAS trait selection">
          {spec.cas && doc.acquisition.methods.includes("cas") ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-lg">✦</div>
              <div>
                <div className="text-[13px] font-semibold">{doc.displayName}</div>
                <div className="text-[11px] text-muted-foreground">{doc.description || "No description yet."}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{doc.category}</div>
              </div>
            </div>
          ) : (
            <EmptyHint>This trait does not appear in CAS.</EmptyHint>
          )}
        </Panel>

        <Panel title="Simology panel">
          {spec.simology && visible ? (
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-[12px] font-semibold">{doc.displayName}</div>
              <div className="text-[11px] text-muted-foreground">{doc.description}</div>
            </div>
          ) : (
            <EmptyHint>Hidden from Simology.</EmptyHint>
          )}
        </Panel>

        <Panel title="Reward store">
          {doc.acquisition.methods.includes("reward-store") ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div>
                <div className="text-[12px] font-semibold">{doc.acquisition.rewardStore.name || doc.displayName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {doc.acquisition.rewardStore.description || doc.description}
                </div>
              </div>
              <Badge tone="accent">{doc.acquisition.rewardStore.cost} pts</Badge>
            </div>
          ) : (
            <EmptyHint>Not sold in the reward store.</EmptyHint>
          )}
        </Panel>

        <Panel title="Acquisition notification">
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="text-[12px] font-semibold">
              {doc.strings.acquisitionNotification.text || `${doc.displayName} gained`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {doc.strings.unlockMessage.text || doc.description}
            </div>
          </div>
        </Panel>

        <Panel title="Connected moodlets">
          {buffs.length ? (
            <div className="space-y-1.5">
              {buffs.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5">
                  <span className="text-[11.5px] font-medium">{b.label}</span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {b.kind === "buff" ? `${b.mood} +${b.moodWeight} · ${b.durationHours || "∞"}h` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint>No moodlets connected.</EmptyHint>
          )}
        </Panel>

        <Panel title="Conflict warning">
          {doc.conflicts.length ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[11.5px]">
              {doc.strings.conflictWarning.text ||
                `${doc.displayName} cannot be combined with ${doc.conflicts.length} other trait(s).`}
            </div>
          ) : (
            <EmptyHint>No conflicts to warn about.</EmptyHint>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================== advanced == */

export function AdvancedSection({ doc, patch, ctx }: SectionProps) {
  const keys = computeTraitKeys(doc);
  const spec = traitTypeSpec(doc.traitType);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [showXml, setShowXml] = useState(false);
  const result = useMemo(() => exportTrait(doc, ctx, { includeReport: false }), [doc, ctx]);
  const xml = result.files.find((f) => f.kind === "tuning")?.contents ?? "// blocked by validation errors";
  const preview = previewKeys(doc.ids.namespace, doc.ids.internalName);

  return (
    <div className="space-y-4">
      <Panel title="Identity" subtitle="Generated, deterministic and stable. Nothing here changes on a normal save or export.">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Row k="Canonical project id" v={doc.ids.uuid} />
          <Row k="Tuning name" v={keys.tuningName} />
          <Row k="Hash input" v={keys.hashInput} />
          <Row k="Tuning instance (hex)" v={keys.tuning.instance} />
          <Row k="Tuning instance (dec)" v={keys.tuningDecimal} />
          <Row k="SimData instance" v={keys.simData.instance} />
          <Row k="FNV32 of tuning name" v={keys.fnv32} />
          <Row k="Resource type / group" v={`${keys.tuning.type} / ${keys.tuning.group}`} />
          <Row k="XML class / module" v={`Trait / traits.traits`} />
          <Row k="Game trait_type" v={spec.gameTraitType} />
        </dl>
        {preview.instance !== keys.tuning.instance && !keys.manual.tuning && (
          <p className="mt-2 text-[10.5px] text-amber-500">
            Collision avoidance moved this instance off its natural hash ({preview.instance}).
          </p>
        )}
      </Panel>

      <Panel title="ID overrides" subtitle="Only for matching an existing published resource. Everything else should stay generated.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tuning instance override" hint="16 hex digits.">
            <TextInput
              className="font-mono"
              value={doc.ids.manualTuningInstance ?? ""}
              placeholder={keys.tuning.instance}
              onChange={(e) => patch((d) => ({ ...d, ids: { ...d.ids, manualTuningInstance: e.target.value.toUpperCase() } }))}
            />
          </Field>
          <Field label="SimData instance override" hint="Must match the tuning instance unless you have a very specific reason.">
            <TextInput
              className="font-mono"
              value={doc.ids.manualSimDataInstance ?? ""}
              placeholder={keys.simData.instance}
              onChange={(e) => patch((d) => ({ ...d, ids: { ...d.ids, manualSimDataInstance: e.target.value.toUpperCase() } }))}
            />
          </Field>
        </div>
        {(doc.ids.manualTuningInstance || doc.ids.manualSimDataInstance) && (
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="warn">manual ids in use</Badge>
            <Btn onClick={() => patch((d) => ({ ...d, ids: { ...d.ids, manualTuningInstance: "", manualSimDataInstance: "" } }))}>
              Back to generated
            </Btn>
          </div>
        )}

        <div className="mt-3 border-t border-border pt-3">
          {!confirmRegen ? (
            <Btn icon={RefreshCw} onClick={() => setConfirmRegen(true)}>Regenerate IDs</Btn>
          ) : (
            <div className="rounded-md border border-red-500/40 bg-red-500/5 p-2.5 text-[11px]">
              <p className="mb-2">
                Regenerating rebuilds this trait's instance from the current namespace and internal
                name. Anything already published that references the old id — saves, other mods —
                will break. References inside this project are updated together.
              </p>
              <div className="flex gap-1.5">
                <Btn
                  variant="danger"
                  onClick={() => {
                    patch((d) => ({ ...d, ids: { ...d.ids, manualTuningInstance: "", manualSimDataInstance: "" } }));
                    setConfirmRegen(false);
                    toast.success("IDs regenerated from the current name");
                  }}
                >
                  Yes, regenerate
                </Btn>
                <Btn onClick={() => setConfirmRegen(false)}>Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="Generated resources"
        subtitle="Exactly what the exporter will write."
        actions={<Btn onClick={() => setShowXml((v) => !v)}>{showXml ? "Hide" : "Show"} XML</Btn>}
      >
        {showXml && (
          <pre className="max-h-80 overflow-auto rounded-md border border-border bg-background p-2.5 font-mono text-[10.5px] leading-relaxed">
            {xml}
          </pre>
        )}
        <div className="mt-2 space-y-1 text-[11px]">
          {result.files.map((f) => (
            <div key={f.name} className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5">
              <span className="font-mono text-[10.5px]">{f.name}</span>
              <span className="flex items-center gap-1.5">
                <Badge>{f.kind}</Badge>
                {f.resourceKey && <code className="font-mono text-[10px] text-muted-foreground">{f.resourceKey}</code>}
              </span>
            </div>
          ))}
        </div>
        {!result.loadable && (
          <p className="mt-2 text-[10.5px] text-amber-500">
            {result.blockers.join(" ")}
          </p>
        )}
      </Panel>

      <Panel title="Reference list" subtitle="Everything this trait points at, as it will resolve at build time.">
        <ReferenceTable doc={doc} ctx={ctx} />
      </Panel>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded-md border border-border bg-background px-2.5 py-1.5">
    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
    <dd className="truncate font-mono text-[11px]">{v}</dd>
  </div>
);

function ReferenceTable({ doc, ctx }: { doc: TraitDoc; ctx: ResolveContext }) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rows = useMemo(() => {
    return doc.effects.flatMap((e) => {
      const r = "ref" in e ? e.ref : null;
      if (!r) return [];
      const res = resolveRef(r, ctx);
      return [{ path: e.label, kind: r.resourceKind, source: r.source, name: res.tuningName, id: res.tuningId, status: res.status }];
    });
  }, [doc, ctx]);

  if (!rows.length) return <EmptyHint>No references yet.</EmptyHint>;
  return (
    <table className="w-full text-[11px]">
      <thead className="text-muted-foreground">
        <tr>
          <th className="py-1 text-left font-semibold">Effect</th>
          <th className="py-1 text-left font-semibold">Kind</th>
          <th className="py-1 text-left font-semibold">Source</th>
          <th className="py-1 text-left font-semibold">Tuning</th>
          <th className="py-1 text-left font-semibold">Id</th>
          <th className="py-1 text-left font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border">
            <td className="py-1 pr-2">{r.path}</td>
            <td className="py-1 pr-2">{r.kind}</td>
            <td className="py-1 pr-2">{r.source}</td>
            <td className="py-1 pr-2 font-mono text-[10px]">{r.name}</td>
            <td className="py-1 pr-2 font-mono text-[10px]">{r.id}</td>
            <td className="py-1">
              <Badge tone={r.status === "ok" ? "ok" : "error"}>{r.status}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* --------------------------------------------------------------- exports -- */

export function useResolveContext(): ResolveContext {
  const store = useStore();
  const project = useActiveProject();
  return useMemo(
    () => ({ state: store.state, ...(project ? { projectId: project.id } : {}) }),
    [store.state, project],
  );
}
