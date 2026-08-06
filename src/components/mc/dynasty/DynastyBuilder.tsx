/**
 * Custom Dynasty Builder shell.
 *
 * Sections follow the order a creator actually thinks in: what the thing is
 * called, who may belong, who outranks whom, who takes over, what it believes,
 * who may act — then what the export will and will not touch.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BookOpen, Crown, GitBranch, Landmark, Redo2, Save, Scale, ShieldCheck,
  Undo2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Badge, Btn, EmptyHint, Field, NumberInput, Panel, SelectInput, TextArea, TextInput, Toggle,
} from "@/components/mc/trait/primitives";
import { HierarchyWhiteboard } from "./HierarchyWhiteboard";
import { DynastyLanding } from "./DynastyLanding";
import { useDynastyLibrary } from "@/lib/dynasty/store";
import { SEVERITY_LABEL, validateDynasty, type Finding, type Severity } from "@/lib/dynasty/validate";
import { computeRequirements, requirementSummary } from "@/lib/dynasty/ids";
import {
  COMPAT_MODES, COMPAT_MODE_BLURB, COMPAT_MODE_LABEL, FAMILY_RELATIONS, FAMILY_RELATION_LABEL,
  LEADERSHIP_STRUCTURES, LEADERSHIP_STRUCTURE_LABEL, MEMBERSHIP_STRUCTURES,
  MEMBERSHIP_STRUCTURE_LABEL, NO_SUCCESSOR_LABEL, NO_SUCCESSOR_OUTCOMES, PERMISSIONS,
  PERMISSION_LABEL, PERMISSION_STATES, PERMISSION_STATE_LABEL, RECRUITMENT_OPTIONS,
  RECRUITMENT_OPTION_LABEL, REQUIREMENT_LABEL, SUCCESSION_RULES, SUCCESSION_RULE_LABEL,
  TERM_FRAMEWORK_REF, blankMembershipType, blankValue, did, effectivePermission,
  sanitizeInternalName,
  type DynastyDoc, type PermissionState, type Terminology,
} from "@/lib/dynasty/schema";

type SectionKey =
  | "identity" | "terms" | "membership" | "hierarchy" | "succession"
  | "values" | "permissions" | "compat";

const SECTIONS: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "identity", label: "Identity", icon: Crown },
  { key: "terms", label: "Terminology", icon: BookOpen },
  { key: "membership", label: "Membership", icon: Users },
  { key: "hierarchy", label: "Hierarchy", icon: GitBranch },
  { key: "succession", label: "Succession", icon: Landmark },
  { key: "values", label: "Values", icon: Scale },
  { key: "permissions", label: "Permissions", icon: ShieldCheck },
  { key: "compat", label: "EA safety", icon: ShieldCheck },
];

const SEVERITY_TONE: Record<Severity, "error" | "warn" | "accent" | "muted"> = {
  blocking: "error", likely_failure: "error", compatibility: "warn", design: "warn", info: "muted",
};

export function DynastyBuilder() {
  const lib = useDynastyLibrary();
  const [openId, setOpenId] = useState<string | undefined>();
  const doc = openId ? lib.get(openId) : undefined;

  if (!doc) return <DynastyLanding onOpen={setOpenId} />;
  return <Editor key={doc.uuid} doc={doc} onBack={() => setOpenId(undefined)} />;
}

function Editor({ doc, onBack }: { doc: DynastyDoc; onBack: () => void }) {
  const lib = useDynastyLibrary();
  const [draft, setDraft] = useState<DynastyDoc>(doc);
  const [section, setSection] = useState<SectionKey>("identity");
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<DynastyDoc[]>([doc]);
  const [cursor, setCursor] = useState(0);
  const [focusRole, setFocusRole] = useState<string | undefined>();

  const others = useMemo(() => lib.docs.filter((d) => d.uuid !== draft.uuid), [lib.docs, draft.uuid]);
  const validation = useMemo(() => validateDynasty(draft, { others }), [draft, others]);
  const problemRoleIds = useMemo(
    () => new Set(validation.findings.filter((f) => f.targetId).map((f) => f.targetId!)),
    [validation.findings],
  );

  const apply = useCallback(
    (next: DynastyDoc) => {
      setDraft(next);
      setDirty(true);
      setHistory((h) => [...h.slice(0, cursor + 1), next].slice(-60));
      setCursor((c) => Math.min(c + 1, 59));
    },
    [cursor],
  );

  const patch = useCallback((p: Partial<DynastyDoc>) => apply({ ...draft, ...p }), [apply, draft]);

  /* Auto-save, matching the rest of the app's 1.2s debounce. */
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      lib.update(draft.uuid, draft);
      setDirty(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [draft, dirty, lib]);

  const undo = () => {
    if (cursor === 0) return;
    setCursor(cursor - 1);
    setDraft(history[cursor - 1]!);
    setDirty(true);
  };
  const redo = () => {
    if (cursor >= history.length - 1) return;
    setCursor(cursor + 1);
    setDraft(history[cursor + 1]!);
    setDirty(true);
  };

  const jumpTo = (f: Finding) => {
    const map: Record<string, SectionKey> = {
      identity: "identity", visual: "identity", compat: "compat", hierarchy: "hierarchy",
      roles: "hierarchy", membership: "membership", membership_types: "membership",
      succession: "succession", values: "values", expectations: "values", conduct: "values",
      permissions: "permissions", punishments: "permissions", rewards: "permissions",
    };
    setSection(map[f.section] ?? "identity");
    if (f.targetId) setFocusRole(f.targetId);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <Btn icon={ArrowLeft} onClick={onBack}>Library</Btn>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{draft.identity.typeName}</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            {draft.terms.organization} · {COMPAT_MODE_LABEL[draft.compatMode]}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge tone={validation.eaSafe ? "ok" : "error"}>
            {validation.eaSafe ? "EA-safe" : "EA conflict"}
          </Badge>
          <Badge tone={validation.exportable ? "ok" : "error"}>Health {validation.health}</Badge>
          <Btn icon={Undo2} onClick={undo} disabled={cursor === 0} title="Undo" />
          <Btn icon={Redo2} onClick={redo} disabled={cursor >= history.length - 1} title="Redo" />
          <Btn
            icon={Save}
            variant="primary"
            onClick={() => {
              lib.update(draft.uuid, draft);
              setDirty(false);
              toast.success("Saved");
            }}
          >
            {dirty ? "Save" : "Saved"}
          </Btn>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[168px_minmax(0,1fr)_282px]">
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11.5px] font-medium transition-colors",
                section === s.key ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          {section === "identity" && <IdentitySection doc={draft} patch={patch} />}
          {section === "terms" && <TermsSection doc={draft} patch={patch} />}
          {section === "membership" && <MembershipSection doc={draft} patch={patch} apply={apply} />}
          {section === "hierarchy" && (
            <HierarchyWhiteboard
              doc={draft}
              onChange={apply}
              problemRoleIds={problemRoleIds}
              selectedId={focusRole}
              onSelect={setFocusRole}
            />
          )}
          {section === "succession" && <SuccessionSection doc={draft} patch={patch} apply={apply} />}
          {section === "values" && <ValuesSection doc={draft} apply={apply} />}
          {section === "permissions" && <PermissionsSection doc={draft} apply={apply} />}
          {section === "compat" && <CompatSection doc={draft} patch={patch} />}
        </div>

        <aside className="space-y-3">
          <Panel title="Validation" subtitle={`${validation.findings.length} findings`}>
            {validation.findings.length === 0 ? (
              <EmptyHint>Nothing to fix. This organization is ready to export.</EmptyHint>
            ) : (
              <ul className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
                {validation.findings.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(f)}
                      className="w-full rounded-md border border-border bg-background p-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <Badge tone={SEVERITY_TONE[f.severity]}>{SEVERITY_LABEL[f.severity]}</Badge>
                      <p className="mt-1 text-[11px]">{f.message}</p>
                      {f.fix && <p className="mt-0.5 text-[10.5px] text-muted-foreground">{f.fix}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ parts  */

function IdentitySection({ doc, patch }: { doc: DynastyDoc; patch: (p: Partial<DynastyDoc>) => void }) {
  const id = doc.identity;
  const set = (p: Partial<DynastyDoc["identity"]>) => patch({ identity: { ...id, ...p } });
  return (
    <Panel title="Identity" subtitle="What this organization is, before any rules apply.">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Type name">
          <TextInput
            value={id.typeName}
            onChange={(e) =>
              set({
                typeName: e.target.value,
                displayName: e.target.value,
                internalName: sanitizeInternalName(`Dynasty_${e.target.value}`),
              })
            }
          />
        </Field>
        <Field label="Internal name" hint="Drives every generated id.">
          <TextInput value={id.internalName} onChange={(e) => set({ internalName: sanitizeInternalName(e.target.value) })} />
        </Field>
        <Field label="Creator namespace" hint="Keeps ids unique against other creators.">
          <TextInput value={id.namespace} onChange={(e) => set({ namespace: e.target.value })} />
        </Field>
        <Field label="Motto">
          <TextInput value={id.motto} onChange={(e) => set({ motto: e.target.value })} />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <TextArea value={id.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Founding story" className="md:col-span-2">
          <TextArea value={id.foundingStory} onChange={(e) => set({ foundingStory: e.target.value })} rows={2} />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Field label="Min members"><NumberInput value={doc.size.minMembers} min={0} onChange={(v) => patch({ size: { ...doc.size, minMembers: v } })} /></Field>
        <Field label="Max members"><NumberInput value={doc.size.maxMembers} min={1} onChange={(v) => patch({ size: { ...doc.size, maxMembers: v } })} /></Field>
        <div className="md:col-span-2 space-y-1.5">
          <Toggle
            checked={doc.size.allowMultipleHouseholds}
            onChange={(v) => patch({ size: { ...doc.size, allowMultipleHouseholds: v } })}
            label="Members may live in different households"
            hint="Matches how EA dynasties span households."
          />
          <Toggle
            checked={doc.size.allowNpc}
            onChange={(v) => patch({ size: { ...doc.size, allowNpc: v } })}
            label="Unplayed and NPC Sims may belong"
          />
        </div>
      </div>
    </Panel>
  );
}

function TermsSection({ doc, patch }: { doc: DynastyDoc; patch: (p: Partial<DynastyDoc>) => void }) {
  const keys = Object.keys(doc.terms) as (keyof Terminology)[];
  return (
    <Panel
      title="Terminology"
      subtitle="Rename the vocabulary players see. The framework concept behind each word is shown so nothing gets lost."
    >
      <div className="grid gap-2.5 md:grid-cols-2">
        {keys.map((k) => (
          <Field key={k} label={k.replace(/([A-Z])/g, " $1")} hint={TERM_FRAMEWORK_REF[k]}>
            <TextInput
              value={doc.terms[k]}
              onChange={(e) => patch({ terms: { ...doc.terms, [k]: e.target.value } })}
            />
          </Field>
        ))}
      </div>
    </Panel>
  );
}

function MembershipSection({
  doc, patch, apply,
}: {
  doc: DynastyDoc;
  patch: (p: Partial<DynastyDoc>) => void;
  apply: (d: DynastyDoc) => void;
}) {
  const m = doc.membership;
  const set = (p: Partial<typeof m>) => patch({ membership: { ...m, ...p } });
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="space-y-4">
      <Panel
        title="Who may belong"
        subtitle="Membership is separate from bloodline. Somebody can be born into the line and never be admitted — and an outsider can be inducted with full standing."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Structure">
            <SelectInput
              value={m.structure}
              onChange={(v) => set({ structure: v })}
              options={MEMBERSHIP_STRUCTURES.map((s) => ({ value: s, label: MEMBERSHIP_STRUCTURE_LABEL[s] }))}
            />
          </Field>
          <div className="space-y-1.5">
            <Toggle checked={m.keepInFamily} onChange={(v) => set({ keepInFamily: v })} label="Keep membership in the family" />
            <Toggle checked={m.allowNonFamily} onChange={(v) => set({ allowNonFamily: v })} label="Allow non-family recruitment" />
          </div>
        </div>

        <Field label="Qualifying family relationships" className="mt-3">
          <div className="flex flex-wrap gap-1">
            {FAMILY_RELATIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set({ qualifyingRelations: toggleIn(m.qualifyingRelations, r) })}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10.5px]",
                  m.qualifyingRelations.includes(r) ? "border-primary/50 bg-primary/15" : "border-border text-muted-foreground",
                )}
              >
                {FAMILY_RELATION_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Recruitment methods" className="mt-3">
          <div className="flex flex-wrap gap-1">
            {RECRUITMENT_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set({ recruitment: toggleIn(m.recruitment, r) })}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10.5px]",
                  m.recruitment.includes(r) ? "border-primary/50 bg-primary/15" : "border-border text-muted-foreground",
                )}
              >
                {RECRUITMENT_OPTION_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-3 space-y-1.5">
          <Toggle
            checked={m.respectEaSingleDynastyRule}
            onChange={(v) => set({ respectEaSingleDynastyRule: v })}
            label="Respect EA's one-dynasty-per-Sim rule"
            hint="Leaving this on is what keeps the mod compatible with the base framework."
          />
          <Toggle
            checked={m.allowDualMembership}
            onChange={(v) => set({ allowDualMembership: v })}
            label="A Sim may also belong to another custom organization"
          />
        </div>
      </Panel>

      <Panel
        title="Bloodline"
        subtitle="Ancestry is tracked independently and is never revoked, even for exiles."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-3">
            <Toggle
              checked={doc.bloodline.enabled}
              onChange={(v) => patch({ bloodline: { ...doc.bloodline, enabled: v } })}
              label="Track descent from the founder"
            />
          </div>
          <Field label="Generations tracked">
            <NumberInput
              value={doc.bloodline.generationsTracked}
              min={1}
              onChange={(v) => patch({ bloodline: { ...doc.bloodline, generationsTracked: v } })}
            />
          </Field>
          <div className="md:col-span-2 space-y-1.5">
            <Toggle
              checked={doc.bloodline.bloodlineGrantsMembership}
              onChange={(v) => patch({ bloodline: { ...doc.bloodline, bloodlineGrantsMembership: v } })}
              label="Descendants are admitted automatically"
            />
            <Toggle
              checked={doc.bloodline.bloodlineGrantsSuccession}
              onChange={(v) => patch({ bloodline: { ...doc.bloodline, bloodlineGrantsSuccession: v } })}
              label="Descendants may inherit leadership"
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Membership categories"
        subtitle="Standing inside the organization — separate again from the position a member holds."
        actions={
          <Btn
            onClick={() =>
              apply({ ...doc, membershipTypes: [...doc.membershipTypes, blankMembershipType()] })
            }
          >
            Add category
          </Btn>
        }
      >
        {doc.membershipTypes.length === 0 ? (
          <EmptyHint>No categories yet — every member would be identical.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {doc.membershipTypes.map((t) => (
              <div key={t.uuid} className="grid gap-2 rounded-lg border border-border bg-background p-2.5 md:grid-cols-[1fr_1fr_auto]">
                <Field label="Name">
                  <TextInput
                    value={t.displayName}
                    onChange={(e) =>
                      apply({
                        ...doc,
                        membershipTypes: doc.membershipTypes.map((x) =>
                          x.uuid === t.uuid
                            ? { ...x, displayName: e.target.value, internalName: sanitizeInternalName(e.target.value) }
                            : x,
                        ),
                      })
                    }
                  />
                </Field>
                <div className="space-y-1.5 pt-4">
                  <Toggle
                    checked={t.successionEligible}
                    onChange={(v) =>
                      apply({
                        ...doc,
                        membershipTypes: doc.membershipTypes.map((x) => (x.uuid === t.uuid ? { ...x, successionEligible: v } : x)),
                      })
                    }
                    label="May inherit leadership"
                  />
                  <Toggle
                    checked={t.typicallyBloodline}
                    onChange={(v) =>
                      apply({
                        ...doc,
                        membershipTypes: doc.membershipTypes.map((x) => (x.uuid === t.uuid ? { ...x, typicallyBloodline: v } : x)),
                      })
                    }
                    label="Usually held by blood relatives"
                  />
                </div>
                <div className="flex items-start pt-4">
                  <Btn
                    variant="danger"
                    onClick={() =>
                      apply({ ...doc, membershipTypes: doc.membershipTypes.filter((x) => x.uuid !== t.uuid) })
                    }
                  >
                    Remove
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function SuccessionSection({
  doc, patch, apply,
}: {
  doc: DynastyDoc;
  patch: (p: Partial<DynastyDoc>) => void;
  apply: (d: DynastyDoc) => void;
}) {
  const s = doc.succession;
  const set = (p: Partial<typeof s>) => patch({ succession: { ...s, ...p } });

  return (
    <div className="space-y-4">
      <Panel title="Leadership" subtitle="How authority is held, and what happens when the holder dies.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Structure">
            <SelectInput
              value={s.structure}
              onChange={(v) => set({ structure: v })}
              options={LEADERSHIP_STRUCTURES.map((x) => ({ value: x, label: LEADERSHIP_STRUCTURE_LABEL[x] }))}
            />
          </Field>
          <Field label="If no successor qualifies">
            <SelectInput
              value={s.noSuccessor}
              onChange={(v) => set({ noSuccessor: v })}
              options={NO_SUCCESSOR_OUTCOMES.map((x) => ({ value: x, label: NO_SUCCESSOR_LABEL[x] }))}
            />
          </Field>
          <div className="md:col-span-2">
            <Toggle
              checked={s.autoTransferOnDeath}
              onChange={(v) => set({ autoTransferOnDeath: v })}
              label="Transfer leadership automatically when the leader dies"
              hint="Player-controlled leaders are still asked first unless automation says otherwise."
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Succession rules"
        subtitle="Evaluated in order; the first rule that produces a qualifying Sim wins."
        actions={
          <Btn
            onClick={() =>
              apply({
                ...doc,
                succession: {
                  ...s,
                  rules: [
                    ...s.rules,
                    {
                      uuid: did("succ"), kind: "named_heir", label: "Named heir", roleIds: [],
                      membershipTypeIds: [], requiredTrait: { kind: "Trait", source: "none", label: "" } as never,
                      requiredSkill: { kind: "Skill", source: "none", label: "" } as never,
                      minSkillLevel: 0, weight: 1,
                      test: { kind: "TestSet", source: "none", label: "" } as never, enabled: true,
                    },
                  ],
                },
              })
            }
          >
            Add rule
          </Btn>
        }
      >
        {s.rules.length === 0 ? (
          <EmptyHint>No rules yet, so leadership never transfers.</EmptyHint>
        ) : (
          <ol className="space-y-2">
            {s.rules.map((r, i) => (
              <li key={r.uuid} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
                <span className="w-5 text-center text-[11px] tabular-nums text-muted-foreground">{i + 1}</span>
                <SelectInput
                  value={r.kind}
                  onChange={(v) =>
                    apply({
                      ...doc,
                      succession: { ...s, rules: s.rules.map((x) => (x.uuid === r.uuid ? { ...x, kind: v } : x)) },
                    })
                  }
                  options={SUCCESSION_RULES.map((k) => ({ value: k, label: SUCCESSION_RULE_LABEL[k] }))}
                  className="max-w-[280px]"
                />
                <Badge tone={r.enabled ? "ok" : "muted"}>{r.enabled ? "Enabled" : "Off"}</Badge>
                <div className="ml-auto flex gap-1">
                  <Btn
                    onClick={() =>
                      apply({
                        ...doc,
                        succession: { ...s, rules: s.rules.map((x) => (x.uuid === r.uuid ? { ...x, enabled: !x.enabled } : x)) },
                      })
                    }
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={() => apply({ ...doc, succession: { ...s, rules: s.rules.filter((x) => x.uuid !== r.uuid) } })}
                  >
                    Remove
                  </Btn>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

function ValuesSection({ doc, apply }: { doc: DynastyDoc; apply: (d: DynastyDoc) => void }) {
  return (
    <Panel
      title="Values"
      subtitle="What the organization rewards and punishes. Scores drive conduct outcomes and prestige."
      actions={<Btn onClick={() => apply({ ...doc, values: [...doc.values, blankValue()] })}>Add value</Btn>}
    >
      {doc.values.length === 0 ? (
        <EmptyHint>No values defined. Members will have nothing to live up to.</EmptyHint>
      ) : (
        <div className="space-y-2">
          {doc.values.map((v) => (
            <div key={v.uuid} className="grid gap-2 rounded-lg border border-border bg-background p-2.5 md:grid-cols-[1fr_2fr_auto]">
              <Field label="Name">
                <TextInput
                  value={v.name}
                  onChange={(e) =>
                    apply({ ...doc, values: doc.values.map((x) => (x.uuid === v.uuid ? { ...x, name: e.target.value } : x)) })
                  }
                />
              </Field>
              <Field label="Description">
                <TextInput
                  value={v.description}
                  onChange={(e) =>
                    apply({ ...doc, values: doc.values.map((x) => (x.uuid === v.uuid ? { ...x, description: e.target.value } : x)) })
                  }
                />
              </Field>
              <div className="flex items-start pt-4">
                <Btn variant="danger" onClick={() => apply({ ...doc, values: doc.values.filter((x) => x.uuid !== v.uuid) })}>
                  Remove
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PermissionsSection({ doc, apply }: { doc: DynastyDoc; apply: (d: DynastyDoc) => void }) {
  const roles = doc.hierarchy.roles;
  const setCell = (roleId: string, key: string, state: PermissionState) =>
    apply({
      ...doc,
      permissions: {
        ...doc.permissions,
        cells: { ...doc.permissions.cells, [roleId]: { ...(doc.permissions.cells[roleId] ?? {}), [key]: state } },
      },
    });

  if (!roles.length)
    return (
      <Panel title="Permissions">
        <EmptyHint>Add roles on the hierarchy board first — permissions are granted to positions.</EmptyHint>
      </Panel>
    );

  return (
    <Panel
      title="Permissions"
      subtitle="Granted to positions, not to Sims. A member with no position holds no authority."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-semibold">Permission</th>
              {roles.map((r) => (
                <th key={r.uuid} className="px-2 py-1.5 text-left font-semibold">
                  <span className="block max-w-[110px] truncate">{r.displayName}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-card px-2 py-1 text-muted-foreground">{PERMISSION_LABEL[p]}</td>
                {roles.map((r) => {
                  const effective = effectivePermission(doc, r.uuid, p);
                  const own = doc.permissions.cells[r.uuid]?.[p] ?? "denied";
                  return (
                    <td key={r.uuid} className="px-1 py-1">
                      <select
                        value={own}
                        onChange={(e) => setCell(r.uuid, p, e.target.value as PermissionState)}
                        title={`Effective: ${PERMISSION_STATE_LABEL[effective]}`}
                        className={cn(
                          "w-full rounded border border-border bg-background px-1 py-0.5 text-[10.5px]",
                          effective === "allowed" && "border-emerald-500/50 text-emerald-500",
                          effective === "denied" && "text-muted-foreground",
                        )}
                      >
                        {PERMISSION_STATES.map((st) => (
                          <option key={st} value={st}>{PERMISSION_STATE_LABEL[st]}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CompatSection({ doc, patch }: { doc: DynastyDoc; patch: (p: Partial<DynastyDoc>) => void }) {
  const reqs = computeRequirements(doc);
  return (
    <div className="space-y-4">
      <Panel
        title="Compatibility mode"
        subtitle="How far this organization reaches beyond plain tuning. Nothing here ever patches EA's dynasty resources."
      >
        <div className="grid gap-2 md:grid-cols-2">
          {COMPAT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => patch({ compatMode: mode })}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                doc.compatMode === mode ? "border-primary/60 bg-primary/10" : "border-border bg-background hover:bg-muted/40",
              )}
            >
              <span className="text-[12px] font-semibold">{COMPAT_MODE_LABEL[mode]}</span>
              <p className="mt-1 text-[11px] text-muted-foreground">{COMPAT_MODE_BLURB[mode]}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="What this build needs" subtitle="Derived from the features actually in use.">
        <div className="mb-3 flex flex-wrap gap-1">
          {requirementSummary(doc).map((r) => (
            <Badge key={r} tone="accent">{REQUIREMENT_LABEL[r]}</Badge>
          ))}
        </div>
        {reqs.length === 0 ? (
          <EmptyHint>Plain tuning only — this will load with no extra dependencies.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {reqs.map((r) => (
              <li
                key={r.feature}
                className={cn(
                  "rounded-md border p-2 text-[11px]",
                  r.beyondMode ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-background",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.feature}</span>
                  <span className="flex gap-1">
                    {r.requirements.map((x) => (
                      <Badge key={x} tone={r.beyondMode ? "warn" : "muted"}>{REQUIREMENT_LABEL[x]}</Badge>
                    ))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
