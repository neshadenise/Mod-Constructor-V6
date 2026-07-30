import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Crown, TreeDeciduous, Boxes, Plus, Pencil, Copy, Trash2, Undo2, Redo2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { PACK_CATALOG, PACK_TIER_LABEL, findPack } from "@/lib/packs/catalog";
import { countRules, validatePackModule, type PackIssue } from "@/lib/packs/validate";
import {
  emptyConditionGroup, emptyLoc, emptyNotify, emptyRef, rid,
  type ClubModuleData, type LegacyModuleData, type PackMechanicModuleData,
  type PackModule, type PackModuleKind, type RoyaltyModuleData, type SuccessionMode, type HeirMode,
} from "@/lib/packs/types";
import {
  BoolField, BuildSupportBadge, ConditionGroupBuilder, Grid, ListEditor, LocalizationEditor,
  LootActionBuilder, NotificationEditor, NumField, PackSection, RefListEditor,
  ResourceReferenceSelector, SelectField, TextField, TokenListField, ValidationPanel, fieldError,
} from "./shared";

const KIND_META: Record<PackModuleKind, { label: string; icon: typeof Users; desc: string; pack: string }> = {
  club: { label: "Club Settings", icon: Users, desc: "Custom Get Together clubs: rules, activities, perks, ranks, uniforms.", pack: "Get Together (EP02)" },
  royalty: { label: "Royalty System", icon: Crown, desc: "Titles, succession, court roles, royal events and interactions.", pack: "Base Game" },
  legacy: { label: "Legacy System", icon: TreeDeciduous, desc: "Generations, heirs, bloodlines, scoring and dynasty records.", pack: "Base Game" },
  pack: { label: "Pack-Specific Mechanics", icon: Boxes, desc: "Modular mechanics for any expansion, game pack, stuff pack or kit.", pack: "Varies" },
};

export function PackMechanicsView({ only }: { only?: PackModuleKind }) {
  const store = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const activeId = store.state.activeProjectId;
  const modules = store.state.packModules.filter((m) => m.projectId === activeId && (!only || m.kind === only));
  const current = store.state.packModules.find((m) => m.id === editing);

  if (current) return <ModuleEditor module={current} onBack={() => setEditing(null)} />;

  const kinds: PackModuleKind[] = only ? [only] : ["club", "royalty", "legacy", "pack"];

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Pack Mechanics</h1>
          <p className="text-[11.5px] text-muted-foreground">
            Structured, buildable configuration for clubs, royalty, legacies and pack-specific systems.
          </p>
        </div>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={!store.canUndoPackModules} onClick={store.undoPackModules}>
            <Undo2 className="mr-1 h-3 w-3" /> Undo
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={!store.canRedoPackModules} onClick={store.redoPackModules}>
            <Redo2 className="mr-1 h-3 w-3" /> Redo
          </Button>
        </div>
      </header>

      <div className="grid gap-2.5 lg:grid-cols-2">
        {kinds.map((k) => {
          const meta = KIND_META[k];
          const Icon = meta.icon;
          const list = modules.filter((m) => m.kind === k);
          return (
            <div key={k} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{meta.label}</div>
                  <div className="text-[11px] leading-snug text-muted-foreground">{meta.desc}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-[9.5px]">{meta.pack}</Badge>
                    <Badge variant="secondary" className="text-[9.5px]">{list.length} module(s)</Badge>
                  </div>
                </div>
                <Button size="sm" className="h-7 px-2 text-[11px]"
                  onClick={() => {
                    const mod = store.createPackModule(k, `New ${meta.label}`);
                    setEditing(mod.id);
                    toast.success(`${meta.label} module created`);
                  }}>
                  <Plus className="mr-1 h-3 w-3" /> New
                </Button>
              </div>

              <div className="mt-2 space-y-1.5">
                {list.length === 0 && <p className="rounded border border-dashed border-border px-2 py-2 text-center text-[11px] text-muted-foreground">No modules yet.</p>}
                {list.map((m) => <ModuleCard key={m.id} module={m} onEdit={() => setEditing(m.id)} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleCard({ module: m, onEdit }: { module: PackModule; onEdit: () => void }) {
  const store = useStore();
  const issues = useMemo(() => validatePackModule(m), [m]);
  const errors = issues.filter((i) => i.level === "error").length;
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-medium">{m.name}</span>
          <Badge variant="outline" className="text-[9px] capitalize">{m.status}</Badge>
          <Badge variant={errors ? "destructive" : "secondary"} className="text-[9px]">
            {errors ? `${errors} error${errors > 1 ? "s" : ""}` : "Valid"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          <span className="truncate">{m.summary || m.requiredPack || "—"}</span>
          <span>· {countRules(m)} rules</span>
          <BuildSupportBadge support={m.buildSupport} compact />
        </div>
      </div>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { store.duplicatePackModule(m.id); toast.success("Module duplicated"); }}>
        <Copy className="h-3 w-3" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { store.deletePackModule(m.id); toast.success("Module deleted"); }}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ModuleEditor({ module: m, onBack }: { module: PackModule; onBack: () => void }) {
  const store = useStore();
  const issues = useMemo(() => validatePackModule(m), [m]);
  const set = (patch: Partial<PackModule>) => store.updatePackModule(m.id, patch);
  const setData = (patch: Record<string, unknown>) => store.updatePackModuleData(m.id, patch as never);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Pack Mechanics
        </Button>
        <h1 className="text-base font-semibold">{m.name}</h1>
        <Badge variant="outline" className="text-[9.5px] capitalize">{m.kind}</Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={!store.canUndoPackModules} onClick={store.undoPackModules}>
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={!store.canRedoPackModules} onClick={store.redoPackModules}>
            <Redo2 className="h-3 w-3" />
          </Button>
        </div>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2.5">
          <PackSection title="Module">
            <Grid cols={3}>
              <TextField label="Module name" value={m.name} onChange={(v) => set({ name: v })} error={fieldError(issues, "name")} />
              <TextField label="Short description" value={m.summary} onChange={(v) => set({ summary: v })} />
              <TextField label="Required pack" value={m.requiredPack} onChange={(v) => set({ requiredPack: v })} error={fieldError(issues, "requiredPack")} />
              <SelectField label="Status" value={m.status} onChange={(v) => set({ status: v })}
                options={[{ value: "draft", label: "Draft" }, { value: "in-progress", label: "In progress" }, { value: "complete", label: "Complete" }]} />
            </Grid>
            <div className="mt-2">
              <div className="mb-1 text-[10.5px] text-muted-foreground">Build pipeline support (generators not yet implemented are struck through):</div>
              <BuildSupportBadge support={m.buildSupport} />
            </div>
          </PackSection>

          {m.kind === "club" && <ClubEditor data={m.data as ClubModuleData} setData={setData} issues={issues} />}
          {m.kind === "royalty" && <RoyaltyEditor data={m.data as RoyaltyModuleData} setData={setData} issues={issues} />}
          {m.kind === "legacy" && <LegacyEditor data={m.data as LegacyModuleData} setData={setData} issues={issues} />}
          {m.kind === "pack" && <PackMechanicEditor data={m.data as PackMechanicModuleData} setData={setData} issues={issues} />}
        </div>

        <div className="space-y-2.5">
          <ValidationPanel issues={issues} />
        </div>
      </div>
    </div>
  );
}

type EditorProps<T> = { data: T; setData: (patch: Record<string, unknown>) => void; issues: PackIssue[] };

/* ----------------------------- Club ------------------------------- */

function ClubEditor({ data, setData, issues }: EditorProps<ClubModuleData>) {
  return (
    <>
      <PackSection title="Club information">
        <Grid cols={3}>
          <TextField label="Internal module name" value={data.internalName} onChange={(v) => setData({ internalName: v })} error={fieldError(issues, "data.internalName")} />
          <NumField label="Minimum members" value={data.minMembers} onChange={(v) => setData({ minMembers: v })} error={fieldError(issues, "data.minMembers")} />
          <NumField label="Maximum members" value={data.maxMembers} onChange={(v) => setData({ maxMembers: v })} error={fieldError(issues, "data.maxMembers")} />
          <NumField label="Starting club points" value={data.startingPoints} onChange={(v) => setData({ startingPoints: v })} />
          <TextField label="Club color" value={data.color} onChange={(v) => setData({ color: v })} />
          <TextField label="Required pack" value={data.requiredPack} onChange={(v) => setData({ requiredPack: v })} />
        </Grid>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <LocalizationEditor label="Display name" keyPrefix="MC6_CLUB" value={data.displayName} onChange={(v) => setData({ displayName: v })} error={fieldError(issues, "data.displayName")} />
          <LocalizationEditor label="Description" multiline keyPrefix="MC6_CLUB" value={data.description} onChange={(v) => setData({ description: v })} />
          <ResourceReferenceSelector label="Club icon" kind="icon" value={data.iconRef} onChange={(v) => setData({ iconRef: v })} />
          <RefListEditor label="Club hangouts" kind="venue" values={data.hangoutRefs} onChange={(v) => setData({ hangoutRefs: v })} />
        </div>
        <div className="mt-2 grid gap-1.5 lg:grid-cols-3">
          <BoolField label="Appears in club picker" value={data.appearsInClubPicker} onChange={(v) => setData({ appearsInClubPicker: v })} />
          <BoolField label="NPCs may create / join" value={data.npcAutonomousJoin} onChange={(v) => setData({ npcAutonomousJoin: v })} />
          <BoolField label="Player can edit in-game" value={data.playerEditable} onChange={(v) => setData({ playerEditable: v })} />
        </div>
      </PackSection>

      <PackSection title="Membership requirements">
        <ConditionGroupBuilder value={data.membership} onChange={(v) => setData({ membership: v })}
          issues={issues.filter((i) => i.path.startsWith("data.membership"))} />
      </PackSection>

      <PackSection title="Activities" subtitle="encouraged & banned">
        <ListEditor
          label="Activities" items={data.activities} onChange={(v) => setData({ activities: v })}
          addLabel="Add activity"
          create={() => ({
            id: rid(), stance: "encouraged", name: "New activity", interactionRef: emptyRef("interaction"),
            category: "", targetType: "", locationRestriction: "", timeRestriction: "", participantRestriction: "",
            clubPoints: 0, autonomyWeight: 1, cooldownMinutes: 0,
            required: emptyConditionGroup(), excluded: emptyConditionGroup("or"),
            tooltip: emptyLoc("MC6_CLUB_ACT_TOOLTIP"), notification: emptyNotify("MC6_CLUB_ACT"),
          })}
          renderTitle={(a) => <>{a.name} <span className="text-[10px] text-muted-foreground">· {a.stance}</span></>}
          renderBody={(a, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Activity name" value={a.name} onChange={(v) => up({ name: v })} />
                <SelectField label="Stance" value={a.stance} onChange={(v) => up({ stance: v })}
                  options={[{ value: "encouraged", label: "Encouraged" }, { value: "banned", label: "Banned" }]} />
                <TextField label="Interaction category" value={a.category} onChange={(v) => up({ category: v })} />
                <TextField label="Target type" value={a.targetType} onChange={(v) => up({ targetType: v })} />
                <TextField label="Location restriction" value={a.locationRestriction} onChange={(v) => up({ locationRestriction: v })} />
                <TextField label="Time restriction" value={a.timeRestriction} onChange={(v) => up({ timeRestriction: v })} />
                <TextField label="Participant restriction" value={a.participantRestriction} onChange={(v) => up({ participantRestriction: v })} />
                <NumField label="Club points" value={a.clubPoints} onChange={(v) => up({ clubPoints: v })} />
                <NumField label="Autonomy weight" value={a.autonomyWeight} onChange={(v) => up({ autonomyWeight: v })} />
                <NumField label="Cooldown (minutes)" value={a.cooldownMinutes} onChange={(v) => up({ cooldownMinutes: v })} />
              </Grid>
              <ResourceReferenceSelector label="Interaction / affordance" kind="interaction" value={a.interactionRef} onChange={(v) => up({ interactionRef: v })} />
              <ConditionGroupBuilder label="Required conditions" value={a.required} onChange={(v) => up({ required: v })} />
              <ConditionGroupBuilder label="Excluded conditions" value={a.excluded} onChange={(v) => up({ excluded: v })} />
              <LocalizationEditor label="Custom tooltip" value={a.tooltip} onChange={(v) => up({ tooltip: v })} />
              <NotificationEditor value={a.notification} onChange={(v) => up({ notification: v })} keyPrefix="MC6_CLUB_ACT" />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Perks" defaultOpen={false}>
        <ListEditor
          label="Club perks" items={data.perks} onChange={(v) => setData({ perks: v })} addLabel="Add perk"
          create={() => ({
            id: rid(), name: "New perk", description: emptyLoc("MC6_CLUB_PERK"), iconRef: emptyRef("icon"),
            pointCost: 100, exclusivePerkIds: [], grantRef: emptyRef("buff"), commodityModifier: 0,
            skillGainModifier: 0, careerModifier: 0, relationshipModifier: 0, autonomyModifier: 0,
            unlockedInteractions: [], clubSizeIncrease: 0, pointGainMultiplier: 1, customEffectRef: emptyRef("any"),
          })}
          renderTitle={(p) => p.name}
          renderBody={(p, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Perk name" value={p.name} onChange={(v) => up({ name: v })} />
                <NumField label="Club point cost" value={p.pointCost} onChange={(v) => up({ pointCost: v })} />
                <SelectField label="Required rank" value={p.requiredRankId ?? ""} onChange={(v) => up({ requiredRankId: v || undefined })}
                  options={[{ value: "", label: "None" }, ...data.ranks.map((r) => ({ value: r.id, label: r.name }))]} />
                <SelectField label="Required previous perk" value={p.requiredPerkId ?? ""} onChange={(v) => up({ requiredPerkId: v || undefined })}
                  options={[{ value: "", label: "None" }, ...data.perks.filter((x) => x.id !== p.id).map((x) => ({ value: x.id, label: x.name }))]} />
                <NumField label="Commodity modifier" value={p.commodityModifier} onChange={(v) => up({ commodityModifier: v })} />
                <NumField label="Skill gain modifier" value={p.skillGainModifier} onChange={(v) => up({ skillGainModifier: v })} />
                <NumField label="Career modifier" value={p.careerModifier} onChange={(v) => up({ careerModifier: v })} />
                <NumField label="Relationship modifier" value={p.relationshipModifier} onChange={(v) => up({ relationshipModifier: v })} />
                <NumField label="Autonomy modifier" value={p.autonomyModifier} onChange={(v) => up({ autonomyModifier: v })} />
                <NumField label="Club size increase" value={p.clubSizeIncrease} onChange={(v) => up({ clubSizeIncrease: v })} />
                <NumField label="Point gain multiplier" value={p.pointGainMultiplier} step={0.1} onChange={(v) => up({ pointGainMultiplier: v })} />
              </Grid>
              <LocalizationEditor label="Description" multiline value={p.description} onChange={(v) => up({ description: v })} />
              <div className="grid gap-1.5 lg:grid-cols-2">
                <ResourceReferenceSelector label="Trait / buff granted" kind="buff" value={p.grantRef} onChange={(v) => up({ grantRef: v })} />
                <ResourceReferenceSelector label="Custom effect" kind="any" value={p.customEffectRef} onChange={(v) => up({ customEffectRef: v })} />
              </div>
              <RefListEditor label="Unlockable interactions" kind="interaction" values={p.unlockedInteractions} onChange={(v) => up({ unlockedInteractions: v })} />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Ranks & roles" defaultOpen={false}>
        <ListEditor
          label="Ranks" items={data.ranks} onChange={(v) => setData({ ranks: v })} addLabel="Add rank"
          create={() => ({
            id: rid(), name: "New rank", description: emptyLoc("MC6_CLUB_RANK"), iconRef: emptyRef("icon"),
            requiredPoints: 0, permissions: [], perkIds: [], allowedRoleIds: [], relationshipRequirement: 0,
            autoPromote: false, autoPromoteConditions: emptyConditionGroup(),
          })}
          renderTitle={(r) => r.name}
          renderBody={(r, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Display name" value={r.name} onChange={(v) => up({ name: v })} />
                <NumField label="Required club points" value={r.requiredPoints} onChange={(v) => up({ requiredPoints: v })} />
                <NumField label="Relationship requirement" value={r.relationshipRequirement} onChange={(v) => up({ relationshipRequirement: v })} />
              </Grid>
              <LocalizationEditor label="Description" value={r.description} onChange={(v) => up({ description: v })} />
              <ResourceReferenceSelector label="Rank icon" kind="icon" value={r.iconRef} onChange={(v) => up({ iconRef: v })} />
              <TokenListField label="Permissions" values={r.permissions} onChange={(v) => up({ permissions: v })} />
              <BoolField label="Automatic promotion" value={r.autoPromote} onChange={(v) => up({ autoPromote: v })} />
              {r.autoPromote && <ConditionGroupBuilder label="Promotion conditions" value={r.autoPromoteConditions} onChange={(v) => up({ autoPromoteConditions: v })} />}
            </>
          )}
        />
        <div className="mt-2">
          <ListEditor
            label="Roles" items={data.roles} onChange={(v) => setData({ roles: v })} addLabel="Add role"
            create={() => ({ id: rid(), name: "New role", description: emptyLoc("MC6_CLUB_ROLE"), permissions: [], behaviorModifiers: [], maxHolders: 1 })}
            renderTitle={(r) => r.name}
            renderBody={(r, up) => (
              <>
                <Grid cols={2}>
                  <TextField label="Role name" value={r.name} onChange={(v) => up({ name: v })} />
                  <NumField label="Maximum holders" value={r.maxHolders} onChange={(v) => up({ maxHolders: v })} />
                </Grid>
                <LocalizationEditor label="Description" value={r.description} onChange={(v) => up({ description: v })} />
                <TokenListField label="Permissions" values={r.permissions} onChange={(v) => up({ permissions: v })} />
                <TokenListField label="Behavior modifiers" values={r.behaviorModifiers} onChange={(v) => up({ behaviorModifiers: v })} />
              </>
            )}
          />
        </div>
      </PackSection>

      <PackSection title="Uniforms & gatherings" defaultOpen={false}>
        <ListEditor
          label="Uniforms" items={data.uniforms} onChange={(v) => setData({ uniforms: v })} addLabel="Add uniform"
          create={() => ({ id: rid(), slot: "everyday", frame: "any", ageGates: [], outfitTags: [], casPartRefs: [], outfitTuningRef: emptyRef("outfit") })}
          renderTitle={(u) => `${u.slot} · ${u.frame}`}
          renderBody={(u, up) => (
            <>
              <Grid cols={3}>
                <SelectField label="Slot" value={u.slot} onChange={(v) => up({ slot: v })}
                  options={["everyday", "formal", "athletic", "swimwear", "career"].map((s) => ({ value: s as typeof u.slot, label: s }))} />
                <SelectField label="Frame" value={u.frame} onChange={(v) => up({ frame: v })}
                  options={["any", "masculine", "feminine"].map((s) => ({ value: s as typeof u.frame, label: s }))} />
              </Grid>
              <TokenListField label="Age gates" values={u.ageGates} onChange={(v) => up({ ageGates: v })} />
              <TokenListField label="Outfit tags" values={u.outfitTags} onChange={(v) => up({ outfitTags: v })} />
              <RefListEditor label="CAS parts" kind="cas-part" values={u.casPartRefs} onChange={(v) => up({ casPartRefs: v })} />
              <ResourceReferenceSelector label="Existing outfit tuning" kind="outfit" value={u.outfitTuningRef} onChange={(v) => up({ outfitTuningRef: v })} />
            </>
          )}
        />
        <div className="mt-2">
          <ListEditor
            label="Gatherings" items={data.gatherings} onChange={(v) => setData({ gatherings: v })} addLabel="Add gathering"
            create={() => ({ id: rid(), name: "New gathering", venueRef: emptyRef("venue"), schedule: "", durationHours: 4, minMembers: 2, goals: [], rewards: [], notification: emptyNotify("MC6_CLUB_GATHER") })}
            renderTitle={(g) => g.name}
            renderBody={(g, up) => (
              <>
                <Grid cols={3}>
                  <TextField label="Name" value={g.name} onChange={(v) => up({ name: v })} />
                  <TextField label="Schedule" value={g.schedule} onChange={(v) => up({ schedule: v })} />
                  <NumField label="Duration (hours)" value={g.durationHours} onChange={(v) => up({ durationHours: v })} />
                  <NumField label="Minimum members" value={g.minMembers} onChange={(v) => up({ minMembers: v })} />
                </Grid>
                <ResourceReferenceSelector label="Venue" kind="venue" value={g.venueRef} onChange={(v) => up({ venueRef: v })} />
                <TokenListField label="Goals" values={g.goals} onChange={(v) => up({ goals: v })} />
                <LootActionBuilder label="Rewards" value={g.rewards} onChange={(v) => up({ rewards: v })} />
                <NotificationEditor value={g.notification} onChange={(v) => up({ notification: v })} keyPrefix="MC6_CLUB_GATHER" />
              </>
            )}
          />
        </div>
      </PackSection>

      <ClubPreview data={data} />
    </>
  );
}

function ClubPreview({ data }: { data: ClubModuleData }) {
  const members = ["Bella Goth", "Mortimer Goth", "Cassandra Goth", "Don Lothario"];
  return (
    <PackSection title="Club preview">
      <div className="rounded-lg bg-gradient-to-b from-[#0b2a3a] to-[#06131c] p-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-lg" style={{ background: data.color }} />
          <div>
            <div className="text-sm font-semibold">{data.displayName.text || "Untitled Club"}</div>
            <div className="text-[11px] text-white/70">{data.description.text || "No club description yet."}</div>
          </div>
          <div className="ml-auto text-right text-[11px] text-white/80">
            <div>Leader · Bella Goth</div>
            <div>{Math.min(members.length, data.maxMembers)}/{data.maxMembers} members</div>
            <div>{data.startingPoints} club points</div>
          </div>
        </div>
        <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
          <div>
            <div className="mb-1 text-[9.5px] uppercase tracking-widest text-[#7fd7f5]/70">Members</div>
            {members.map((n) => <div key={n} className="text-white/85">{n}</div>)}
          </div>
          <div>
            <div className="mb-1 text-[9.5px] uppercase tracking-widest text-[#7fd7f5]/70">Encouraged</div>
            {data.activities.filter((a) => a.stance === "encouraged").slice(0, 5).map((a) => <div key={a.id} className="text-white/85">{a.name}</div>)}
            {data.activities.every((a) => a.stance !== "encouraged") && <div className="text-white/50">None</div>}
          </div>
          <div>
            <div className="mb-1 text-[9.5px] uppercase tracking-widest text-[#7fd7f5]/70">Banned</div>
            {data.activities.filter((a) => a.stance === "banned").slice(0, 5).map((a) => <div key={a.id} className="text-white/85">{a.name}</div>)}
            {data.activities.every((a) => a.stance !== "banned") && <div className="text-white/50">None</div>}
          </div>
        </div>
        <div className="mt-2">
          <div className="mb-1 text-[9.5px] uppercase tracking-widest text-[#7fd7f5]/70">Perks</div>
          <div className="flex flex-wrap gap-1">
            {data.perks.length === 0 && <span className="text-[11px] text-white/50">No perks configured</span>}
            {data.perks.map((p) => <span key={p.id} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{p.name} · {p.pointCost}</span>)}
          </div>
        </div>
      </div>
    </PackSection>
  );
}

/* --------------------------- Royalty ------------------------------ */

const SUCCESSION_MODES: SuccessionMode[] = [
  "absolute-primogeniture", "male-preference", "female-preference", "male-only", "female-only",
  "ultimogeniture", "seniority", "elective", "appointment", "trial", "marriage", "custom-weighted",
];

function RoyaltyEditor({ data, setData, issues }: EditorProps<RoyaltyModuleData>) {
  return (
    <>
      <PackSection title="System information">
        <Grid cols={3}>
          <TextField label="System name" value={data.systemName} onChange={(v) => setData({ systemName: v })} error={fieldError(issues, "data.systemName")} />
          <TextField label="Default royal household" value={data.defaultRoyalHousehold} onChange={(v) => setData({ defaultRoyalHousehold: v })} />
          <TextField label="Royal residence lot" value={data.royalResidenceLot} onChange={(v) => setData({ royalResidenceLot: v })} />
        </Grid>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <LocalizationEditor label="Display name" keyPrefix="MC6_ROYAL" value={data.displayName} onChange={(v) => setData({ displayName: v })} />
          <LocalizationEditor label="Description" multiline keyPrefix="MC6_ROYAL" value={data.description} onChange={(v) => setData({ description: v })} />
          <ResourceReferenceSelector label="System icon" kind="icon" value={data.iconRef} onChange={(v) => setData({ iconRef: v })} />
          <ResourceReferenceSelector label="Court venue" kind="venue" value={data.courtVenueRef} onChange={(v) => setData({ courtVenueRef: v })} />
          <ResourceReferenceSelector label="Prestige statistic" kind="statistic" value={data.prestigeStatRef} onChange={(v) => setData({ prestigeStatRef: v })} />
        </div>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <TokenListField label="Required packs" values={data.requiredPacks} onChange={(v) => setData({ requiredPacks: v })} />
          <TokenListField label="Optional mod dependencies" values={data.optionalMods} onChange={(v) => setData({ optionalMods: v })} />
        </div>
        <div className="mt-2 grid gap-1.5 lg:grid-cols-3">
          <BoolField label="Hereditary system" value={data.hereditary} onChange={(v) => setData({ hereditary: v })} />
          <BoolField label="Multiple royal families" value={data.multipleFamilies} onChange={(v) => setData({ multipleFamilies: v })} />
          <BoolField label="Generate NPC kingdoms" value={data.npcKingdoms} onChange={(v) => setData({ npcKingdoms: v })} />
        </div>
      </PackSection>

      <PackSection title="Titles & ranks">
        <ListEditor
          label="Titles" items={data.titles} onChange={(v) => setData({ titles: v })} addLabel="Add title"
          create={() => ({
            id: rid(), masculineName: emptyLoc("MC6_TITLE_M"), feminineName: emptyLoc("MC6_TITLE_F"),
            neutralName: emptyLoc("MC6_TITLE_N"), description: emptyLoc("MC6_TITLE_DESC"), iconRef: emptyRef("icon"),
            traitRef: emptyRef("trait"), buffRef: emptyRef("buff"), hiddenTraitRef: emptyRef("trait"),
            rankPriority: data.titles.length + 1, prestige: 0, requiredBloodline: "", requiredRelationship: "",
            requiredStatistic: { ref: emptyRef("statistic"), min: 0 }, allowedAges: [], allowedGenders: [],
            allowedOccults: [], allowedHouseholds: [], maxHolders: 1, hereditary: true, revocable: true,
            affectsAutonomy: false, changesGreetings: true, unlocksInteractions: true, changesCareerAccess: false,
            affectsReputation: true,
          })}
          renderTitle={(t) => t.neutralName.text || t.masculineName.text || "Untitled"}
          renderBody={(t, up) => (
            <>
              <div className="grid gap-1.5 lg:grid-cols-3">
                <LocalizationEditor label="Masculine name" value={t.masculineName} onChange={(v) => up({ masculineName: v })} />
                <LocalizationEditor label="Feminine name" value={t.feminineName} onChange={(v) => up({ feminineName: v })} />
                <LocalizationEditor label="Neutral name" value={t.neutralName} onChange={(v) => up({ neutralName: v })} />
              </div>
              <LocalizationEditor label="Description" multiline value={t.description} onChange={(v) => up({ description: v })} />
              <Grid cols={3}>
                <NumField label="Rank priority" value={t.rankPriority} onChange={(v) => up({ rankPriority: v })} />
                <NumField label="Prestige value" value={t.prestige} onChange={(v) => up({ prestige: v })} />
                <NumField label="Maximum holders" value={t.maxHolders} onChange={(v) => up({ maxHolders: v })} />
                <SelectField label="Required parent title" value={t.parentTitleId ?? ""} onChange={(v) => up({ parentTitleId: v || undefined })}
                  options={[{ value: "", label: "None" }, ...data.titles.filter((x) => x.id !== t.id).map((x) => ({ value: x.id, label: x.neutralName.text || "Untitled" }))]} />
                <TextField label="Required bloodline" value={t.requiredBloodline} onChange={(v) => up({ requiredBloodline: v })} />
                <TextField label="Required relationship" value={t.requiredRelationship} onChange={(v) => up({ requiredRelationship: v })} />
              </Grid>
              <div className="grid gap-1.5 lg:grid-cols-2">
                <ResourceReferenceSelector label="Trait granted" kind="trait" value={t.traitRef} onChange={(v) => up({ traitRef: v })} />
                <ResourceReferenceSelector label="Buff granted" kind="buff" value={t.buffRef} onChange={(v) => up({ buffRef: v })} />
                <ResourceReferenceSelector label="Hidden trait" kind="trait" value={t.hiddenTraitRef} onChange={(v) => up({ hiddenTraitRef: v })} />
                <ResourceReferenceSelector label="Required statistic" kind="statistic" value={t.requiredStatistic.ref}
                  onChange={(v) => up({ requiredStatistic: { ...t.requiredStatistic, ref: v } })} />
              </div>
              <Grid cols={4}>
                <TokenListField label="Allowed ages" values={t.allowedAges} onChange={(v) => up({ allowedAges: v })} />
                <TokenListField label="Allowed genders" values={t.allowedGenders} onChange={(v) => up({ allowedGenders: v })} />
                <TokenListField label="Allowed occults" values={t.allowedOccults} onChange={(v) => up({ allowedOccults: v })} />
                <TokenListField label="Allowed households" values={t.allowedHouseholds} onChange={(v) => up({ allowedHouseholds: v })} />
              </Grid>
              <div className="grid gap-1.5 lg:grid-cols-3">
                <BoolField label="Hereditary" value={t.hereditary} onChange={(v) => up({ hereditary: v })} />
                <BoolField label="Revocable" value={t.revocable} onChange={(v) => up({ revocable: v })} />
                <BoolField label="Affects autonomy" value={t.affectsAutonomy} onChange={(v) => up({ affectsAutonomy: v })} />
                <BoolField label="Changes greetings" value={t.changesGreetings} onChange={(v) => up({ changesGreetings: v })} />
                <BoolField label="Unlocks interactions" value={t.unlocksInteractions} onChange={(v) => up({ unlocksInteractions: v })} />
                <BoolField label="Changes career access" value={t.changesCareerAccess} onChange={(v) => up({ changesCareerAccess: v })} />
                <BoolField label="Affects reputation / fame" value={t.affectsReputation} onChange={(v) => up({ affectsReputation: v })} />
              </div>
            </>
          )}
        />
      </PackSection>

      <PackSection title="Succession rules">
        <ListEditor
          label="Succession" items={data.succession} onChange={(v) => setData({ succession: v })} addLabel="Add rule"
          create={() => ({ id: rid(), name: "New succession rule", mode: "absolute-primogeniture", priority: data.succession.length + 1, eligibility: emptyConditionGroup(), exclusions: emptyConditionGroup("or"), weight: 1, notes: "" })}
          renderTitle={(r) => `${r.priority}. ${r.name}`}
          renderBody={(r, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Rule name" value={r.name} onChange={(v) => up({ name: v })} />
                <SelectField label="Mode" value={r.mode} onChange={(v) => up({ mode: v })}
                  options={SUCCESSION_MODES.map((m) => ({ value: m, label: m.replace(/-/g, " ") }))} />
                <NumField label="Priority" value={r.priority} onChange={(v) => up({ priority: v })} />
                <NumField label="Weight" value={r.weight} onChange={(v) => up({ weight: v })} />
                <TextField label="Notes" value={r.notes} onChange={(v) => up({ notes: v })} />
              </Grid>
              <ConditionGroupBuilder label="Eligibility" value={r.eligibility} onChange={(v) => up({ eligibility: v })} />
              <ConditionGroupBuilder label="Exclusions" value={r.exclusions} onChange={(v) => up({ exclusions: v })} />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Marriage & consort rules" defaultOpen={false}>
        <div className="grid gap-1.5 lg:grid-cols-3">
          <BoolField label="Political marriage" value={data.marriage.political} onChange={(v) => setData({ marriage: { ...data.marriage, political: v } })} />
          <BoolField label="Arranged marriage" value={data.marriage.arranged} onChange={(v) => setData({ marriage: { ...data.marriage, arranged: v } })} />
          <BoolField label="Morganatic marriage" value={data.marriage.morganatic} onChange={(v) => setData({ marriage: { ...data.marriage, morganatic: v } })} />
          <BoolField label="Spouse inherits title" value={data.marriage.spouseInheritsTitle} onChange={(v) => setData({ marriage: { ...data.marriage, spouseInheritsTitle: v } })} />
          <BoolField label="Approval required" value={data.marriage.approvalRequired} onChange={(v) => setData({ marriage: { ...data.marriage, approvalRequired: v } })} />
          <BoolField label="Multiple spouses" value={data.marriage.multipleSpouses} onChange={(v) => setData({ marriage: { ...data.marriage, multipleSpouses: v } })} />
          <BoolField label="Royal household transfer" value={data.marriage.householdTransfer} onChange={(v) => setData({ marriage: { ...data.marriage, householdTransfer: v } })} />
          <BoolField label="Dynasty name change" value={data.marriage.dynastyNameChange} onChange={(v) => setData({ marriage: { ...data.marriage, dynastyNameChange: v } })} />
        </div>
        <div className="mt-2">
          <Grid cols={3}>
            <NumField label="Divorce penalty (prestige)" value={data.marriage.divorcePenalty} onChange={(v) => setData({ marriage: { ...data.marriage, divorcePenalty: v } })} />
            <SelectField label="Consort title" value={data.marriage.consortTitleId ?? ""} onChange={(v) => setData({ marriage: { ...data.marriage, consortTitleId: v || undefined } })}
              options={[{ value: "", label: "None" }, ...data.titles.map((t) => ({ value: t.id, label: t.neutralName.text || "Untitled" }))]} />
            <SelectField label="Widow / widower title" value={data.marriage.widowTitleId ?? ""} onChange={(v) => setData({ marriage: { ...data.marriage, widowTitleId: v || undefined } })}
              options={[{ value: "", label: "None" }, ...data.titles.map((t) => ({ value: t.id, label: t.neutralName.text || "Untitled" }))]} />
          </Grid>
        </div>
        <div className="mt-2">
          <ConditionGroupBuilder label="Marriage eligibility" value={data.marriage.eligibility} onChange={(v) => setData({ marriage: { ...data.marriage, eligibility: v } })} />
        </div>
      </PackSection>

      <PackSection title="Court roles" defaultOpen={false}>
        <ListEditor
          label="Court roles" items={data.courtRoles} onChange={(v) => setData({ courtRoles: v })} addLabel="Add role"
          create={() => ({
            id: rid(), name: "New court role", careerRef: emptyRef("career"), traitRef: emptyRef("trait"), buffRef: emptyRef("buff"),
            requiredRelationship: "", schedule: "", salary: 0, responsibilities: [], allowedInteractions: [],
            forbiddenInteractions: [], autonomyRules: "", promotion: emptyConditionGroup(), dismissal: emptyConditionGroup("or"),
          })}
          renderTitle={(r) => r.name}
          renderBody={(r, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Role name" value={r.name} onChange={(v) => up({ name: v })} />
                <TextField label="Work schedule" value={r.schedule} onChange={(v) => up({ schedule: v })} />
                <NumField label="Salary" value={r.salary} onChange={(v) => up({ salary: v })} />
                <SelectField label="Required title" value={r.requiredTitleId ?? ""} onChange={(v) => up({ requiredTitleId: v || undefined })}
                  options={[{ value: "", label: "None" }, ...data.titles.map((t) => ({ value: t.id, label: t.neutralName.text || "Untitled" }))]} />
                <TextField label="Required relationship" value={r.requiredRelationship} onChange={(v) => up({ requiredRelationship: v })} />
                <TextField label="Autonomy rules" value={r.autonomyRules} onChange={(v) => up({ autonomyRules: v })} />
              </Grid>
              <div className="grid gap-1.5 lg:grid-cols-3">
                <ResourceReferenceSelector label="Career" kind="career" value={r.careerRef} onChange={(v) => up({ careerRef: v })} />
                <ResourceReferenceSelector label="Trait" kind="trait" value={r.traitRef} onChange={(v) => up({ traitRef: v })} />
                <ResourceReferenceSelector label="Buff" kind="buff" value={r.buffRef} onChange={(v) => up({ buffRef: v })} />
              </div>
              <TokenListField label="Responsibilities" values={r.responsibilities} onChange={(v) => up({ responsibilities: v })} />
              <RefListEditor label="Allowed interactions" kind="interaction" values={r.allowedInteractions} onChange={(v) => up({ allowedInteractions: v })} />
              <RefListEditor label="Forbidden interactions" kind="interaction" values={r.forbiddenInteractions} onChange={(v) => up({ forbiddenInteractions: v })} />
              <ConditionGroupBuilder label="Promotion conditions" value={r.promotion} onChange={(v) => up({ promotion: v })} />
              <ConditionGroupBuilder label="Dismissal conditions" value={r.dismissal} onChange={(v) => up({ dismissal: v })} />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Royal interactions & events" defaultOpen={false}>
        <ListEditor
          label="Royal interactions" items={data.interactions} onChange={(v) => setData({ interactions: v })} addLabel="Add interaction"
          create={() => ({ id: rid(), name: "Grant title", ref: emptyRef("interaction"), conditions: emptyConditionGroup(), loot: [], notification: emptyNotify("MC6_ROYAL_INT") })}
          renderTitle={(x) => x.name}
          renderBody={(x, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Interaction name" value={x.name} onChange={(v) => up({ name: v })} />
                <SelectField label="Actor title" value={x.actorTitleId ?? ""} onChange={(v) => up({ actorTitleId: v || undefined })}
                  options={[{ value: "", label: "Any" }, ...data.titles.map((t) => ({ value: t.id, label: t.neutralName.text || "Untitled" }))]} />
                <SelectField label="Target title" value={x.targetTitleId ?? ""} onChange={(v) => up({ targetTitleId: v || undefined })}
                  options={[{ value: "", label: "Any" }, ...data.titles.map((t) => ({ value: t.id, label: t.neutralName.text || "Untitled" }))]} />
              </Grid>
              <ResourceReferenceSelector label="Interaction reference" kind="interaction" value={x.ref} onChange={(v) => up({ ref: v })} />
              <ConditionGroupBuilder label="Conditions" value={x.conditions} onChange={(v) => up({ conditions: v })} />
              <LootActionBuilder value={x.loot} onChange={(v) => up({ loot: v })} />
              <NotificationEditor value={x.notification} onChange={(v) => up({ notification: v })} keyPrefix="MC6_ROYAL_INT" />
            </>
          )}
        />
        <div className="mt-2">
          <ListEditor
            label="Royal events" items={data.events} onChange={(v) => setData({ events: v })} addLabel="Add event"
            create={() => ({ id: rid(), name: "Coronation", kind: "coronation", triggers: emptyConditionGroup(), participants: [], venueRef: emptyRef("venue"), requiredRoleIds: [], loot: [], notification: emptyNotify("MC6_ROYAL_EVT"), prestigeChange: 0, relationshipChange: 0, followUpEventIds: [] })}
            renderTitle={(e) => e.name}
            renderBody={(e, up) => (
              <>
                <Grid cols={3}>
                  <TextField label="Event name" value={e.name} onChange={(v) => up({ name: v })} />
                  <TextField label="Event kind" value={e.kind} onChange={(v) => up({ kind: v })} />
                  <NumField label="Prestige change" value={e.prestigeChange} onChange={(v) => up({ prestigeChange: v })} />
                  <NumField label="Relationship change" value={e.relationshipChange} onChange={(v) => up({ relationshipChange: v })} />
                </Grid>
                <TokenListField label="Participants" values={e.participants} onChange={(v) => up({ participants: v })} placeholder="e.g. Queen Cassandra" />
                <ResourceReferenceSelector label="Venue" kind="venue" value={e.venueRef} onChange={(v) => up({ venueRef: v })} />
                <ConditionGroupBuilder label="Trigger conditions" value={e.triggers} onChange={(v) => up({ triggers: v })} />
                <LootActionBuilder value={e.loot} onChange={(v) => up({ loot: v })} />
                <NotificationEditor value={e.notification} onChange={(v) => up({ notification: v })} keyPrefix="MC6_ROYAL_EVT" />
              </>
            )}
          />
        </div>
      </PackSection>

      <PackSection title="Royalty preview">
        <div className="rounded-lg bg-gradient-to-b from-[#2a1b3d] to-[#0d0716] p-3 text-white">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold">House {data.displayName.text || "Goth"}</span>
            <span className="text-[11px] text-white/70">Prestige {data.titles.reduce((n, t) => n + t.prestige, 0)}</span>
          </div>
          <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
            <div>
              <div className="text-[9.5px] uppercase tracking-widest text-[#e9d5ff]/70">Monarch</div>
              <div>Queen Cassandra Goth</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-widest text-[#e9d5ff]/70">Heir</div>
              <div>Prince Alexander Goth</div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-widest text-[#e9d5ff]/70">Succession order</div>
              {(data.succession.length ? data.succession : [{ id: "x", name: "No rule configured" }]).slice(0, 4).map((s, i) => (
                <div key={s.id}>{i + 1}. {s.name}</div>
              ))}
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-widest text-[#e9d5ff]/70">Court</div>
              {data.courtRoles.length === 0 && <div className="text-white/50">No court roles</div>}
              {data.courtRoles.slice(0, 5).map((r) => <div key={r.id}>{r.name}</div>)}
            </div>
          </div>
          <div className="mt-2 rounded-md border border-[#c4b5fd]/40 bg-[#2e1f47]/70 p-2">
            <div className="text-[12px] font-semibold">Queen Cassandra has summoned the royal court.</div>
            <div className="text-[11px] text-white/75">All titled Sims are expected at the throne room before sundown.</div>
          </div>
        </div>
      </PackSection>
    </>
  );
}

/* ---------------------------- Legacy ------------------------------ */

const HEIR_MODES: HeirMode[] = ["oldest", "youngest", "firstborn-gender", "highest-skill", "highest-relationship", "highest-score", "player", "random", "trait-based", "career-based", "occult-based", "challenge", "weighted"];

function LegacyEditor({ data, setData, issues }: EditorProps<LegacyModuleData>) {
  return (
    <>
      <PackSection title="Legacy information">
        <Grid cols={3}>
          <TextField label="Legacy name" value={data.legacyName} onChange={(v) => setData({ legacyName: v })} error={fieldError(issues, "data.legacyName")} />
          <TextField label="Dynasty name" value={data.dynastyName} onChange={(v) => setData({ dynastyName: v })} />
          <TextField label="Founder" value={data.founder} onChange={(v) => setData({ founder: v })} />
          <NumField label="Starting generation" value={data.startingGeneration} onChange={(v) => setData({ startingGeneration: v })} />
          <NumField label="Maximum generations" value={data.maxGenerations} onChange={(v) => setData({ maxGenerations: v })} error={fieldError(issues, "data.maxGenerations")} />
          <TextField label="Active household" value={data.activeHousehold} onChange={(v) => setData({ activeHousehold: v })} />
          <TextField label="Legacy home lot" value={data.homeLot} onChange={(v) => setData({ homeLot: v })} />
        </Grid>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <LocalizationEditor label="Description" multiline keyPrefix="MC6_LEGACY" value={data.description} onChange={(v) => setData({ description: v })} />
          <LocalizationEditor label="Motto" keyPrefix="MC6_LEGACY" value={data.motto} onChange={(v) => setData({ motto: v })} />
          <ResourceReferenceSelector label="Legacy icon" kind="icon" value={data.iconRef} onChange={(v) => setData({ iconRef: v })} />
          <ResourceReferenceSelector label="Family crest" kind="icon" value={data.crestRef} onChange={(v) => setData({ crestRef: v })} />
          <TokenListField label="Required packs" values={data.requiredPacks} onChange={(v) => setData({ requiredPacks: v })} />
          <TokenListField label="Optional dependencies" values={data.optionalMods} onChange={(v) => setData({ optionalMods: v })} />
        </div>
      </PackSection>

      <PackSection title="Generation rules">
        <ListEditor
          label="Generations" items={data.generations} onChange={(v) => setData({ generations: v })} addLabel="Add generation"
          create={() => ({
            id: rid(), number: data.generations.length + 1, name: `Generation ${data.generations.length + 1}`, theme: "",
            description: emptyLoc("MC6_LEGACY_GEN"), requiredTraits: [], forbiddenTraits: [], requiredAspiration: emptyRef("aspiration"),
            requiredCareer: emptyRef("career"), requiredSkills: [], marriageRules: "", childRequirement: 1, occultRequirement: "",
            lotRequirement: "", worldRequirement: "", wealthRequirement: 0, goals: [], failConditions: emptyConditionGroup("or"),
            completionRewards: [], completionTraitRef: emptyRef("trait"), completionBuffRef: emptyRef("buff"),
            unlockables: [], notification: emptyNotify("MC6_LEGACY_GEN"),
          })}
          renderTitle={(g) => `${g.number}. ${g.name}`}
          renderBody={(g, up) => (
            <>
              <Grid cols={3}>
                <NumField label="Generation number" value={g.number} onChange={(v) => up({ number: v })} />
                <TextField label="Generation name" value={g.name} onChange={(v) => up({ name: v })} />
                <TextField label="Theme" value={g.theme} onChange={(v) => up({ theme: v })} />
                <TextField label="Marriage rules" value={g.marriageRules} onChange={(v) => up({ marriageRules: v })} />
                <NumField label="Child requirement" value={g.childRequirement} onChange={(v) => up({ childRequirement: v })} />
                <TextField label="Occult requirement" value={g.occultRequirement} onChange={(v) => up({ occultRequirement: v })} />
                <TextField label="Lot requirement" value={g.lotRequirement} onChange={(v) => up({ lotRequirement: v })} />
                <TextField label="World requirement" value={g.worldRequirement} onChange={(v) => up({ worldRequirement: v })} />
                <NumField label="Wealth requirement" value={g.wealthRequirement} onChange={(v) => up({ wealthRequirement: v })} />
              </Grid>
              <LocalizationEditor label="Description" multiline value={g.description} onChange={(v) => up({ description: v })} />
              <div className="grid gap-1.5 lg:grid-cols-2">
                <RefListEditor label="Required traits" kind="trait" values={g.requiredTraits} onChange={(v) => up({ requiredTraits: v })} />
                <RefListEditor label="Forbidden traits" kind="trait" values={g.forbiddenTraits} onChange={(v) => up({ forbiddenTraits: v })} />
                <ResourceReferenceSelector label="Required aspiration" kind="aspiration" value={g.requiredAspiration} onChange={(v) => up({ requiredAspiration: v })} />
                <ResourceReferenceSelector label="Required career" kind="career" value={g.requiredCareer} onChange={(v) => up({ requiredCareer: v })} />
                <ResourceReferenceSelector label="Completion trait" kind="trait" value={g.completionTraitRef} onChange={(v) => up({ completionTraitRef: v })} />
                <ResourceReferenceSelector label="Completion buff" kind="buff" value={g.completionBuffRef} onChange={(v) => up({ completionBuffRef: v })} />
              </div>
              <TokenListField label="Unlockable content" values={g.unlockables} onChange={(v) => up({ unlockables: v })} />
              <TokenListField label="Goals" values={g.goals.map((x) => x.text)}
                onChange={(v) => up({ goals: v.map((text) => ({ id: rid(), text, points: 0 })) })} />
              <ConditionGroupBuilder label="Fail conditions" value={g.failConditions} onChange={(v) => up({ failConditions: v })} />
              <LootActionBuilder label="Completion rewards" value={g.completionRewards} onChange={(v) => up({ completionRewards: v })} />
              <NotificationEditor value={g.notification} onChange={(v) => up({ notification: v })} keyPrefix="MC6_LEGACY_GEN" />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Heir selection">
        <ListEditor
          label="Heir rules" items={data.heirRules} onChange={(v) => setData({ heirRules: v })} addLabel="Add heir rule"
          create={() => ({ id: rid(), mode: "oldest", priority: data.heirRules.length + 1, parameter: "", conditions: emptyConditionGroup(), isBackup: false })}
          renderTitle={(h) => `${h.priority}. ${h.mode}${h.isBackup ? " (backup)" : ""}`}
          renderBody={(h, up) => (
            <>
              <Grid cols={3}>
                <SelectField label="Mode" value={h.mode} onChange={(v) => up({ mode: v })} options={HEIR_MODES.map((m) => ({ value: m, label: m.replace(/-/g, " ") }))} />
                <NumField label="Priority" value={h.priority} onChange={(v) => up({ priority: v })} />
                <TextField label="Parameter" value={h.parameter} onChange={(v) => up({ parameter: v })} hint="Skill, trait, gender…" />
              </Grid>
              <BoolField label="Backup / alternate heir rule" value={h.isBackup} onChange={(v) => up({ isBackup: v })} />
              <ConditionGroupBuilder label="Conditions" value={h.conditions} onChange={(v) => up({ conditions: v })} />
            </>
          )}
        />
        {fieldError(issues, "data.heirRules") && <p className="mt-1 text-[10.5px] text-destructive">{fieldError(issues, "data.heirRules")}</p>}
      </PackSection>

      <PackSection title="Bloodlines" defaultOpen={false}>
        <ListEditor
          label="Bloodlines" items={data.bloodlines} onChange={(v) => setData({ bloodlines: v })} addLabel="Add bloodline"
          create={() => ({
            id: rid(), name: "New bloodline", description: emptyLoc("MC6_BLOODLINE"), iconRef: emptyRef("icon"), hidden: false,
            founder: "", inheritanceChance: 50, maternalChance: 50, paternalChance: 50, adoptionInherits: false,
            marriageInherits: false, occultRules: "", generationDecay: 0, tiers: [], buffRefs: [], skillEffects: "",
            motiveEffects: "", autonomyEffects: "", relationshipEffects: "", careerEffects: "", pregnancyEffects: "",
            fertilityEffects: "", lifespanEffects: "", interactionRefs: [], visualEffects: "", statisticRefs: [],
          })}
          renderTitle={(b) => b.name}
          renderBody={(b, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Bloodline name" value={b.name} onChange={(v) => up({ name: v })} />
                <TextField label="Founder" value={b.founder} onChange={(v) => up({ founder: v })} />
                <NumField label="Inheritance chance (%)" value={b.inheritanceChance} onChange={(v) => up({ inheritanceChance: v })} />
                <NumField label="Maternal chance (%)" value={b.maternalChance} onChange={(v) => up({ maternalChance: v })} />
                <NumField label="Paternal chance (%)" value={b.paternalChance} onChange={(v) => up({ paternalChance: v })} />
                <NumField label="Generation decay" value={b.generationDecay} onChange={(v) => up({ generationDecay: v })} />
                <TextField label="Occult inheritance rules" value={b.occultRules} onChange={(v) => up({ occultRules: v })} />
                <TextField label="Skill effects" value={b.skillEffects} onChange={(v) => up({ skillEffects: v })} />
                <TextField label="Motive effects" value={b.motiveEffects} onChange={(v) => up({ motiveEffects: v })} />
                <TextField label="Autonomy effects" value={b.autonomyEffects} onChange={(v) => up({ autonomyEffects: v })} />
                <TextField label="Relationship effects" value={b.relationshipEffects} onChange={(v) => up({ relationshipEffects: v })} />
                <TextField label="Career effects" value={b.careerEffects} onChange={(v) => up({ careerEffects: v })} />
                <TextField label="Pregnancy effects" value={b.pregnancyEffects} onChange={(v) => up({ pregnancyEffects: v })} />
                <TextField label="Fertility effects" value={b.fertilityEffects} onChange={(v) => up({ fertilityEffects: v })} />
                <TextField label="Lifespan effects" value={b.lifespanEffects} onChange={(v) => up({ lifespanEffects: v })} />
                <TextField label="Visual effects" value={b.visualEffects} onChange={(v) => up({ visualEffects: v })} />
              </Grid>
              <div className="grid gap-1.5 lg:grid-cols-3">
                <BoolField label="Hidden trait" value={b.hidden} onChange={(v) => up({ hidden: v })} />
                <BoolField label="Adoption inherits" value={b.adoptionInherits} onChange={(v) => up({ adoptionInherits: v })} />
                <BoolField label="Marriage inherits" value={b.marriageInherits} onChange={(v) => up({ marriageInherits: v })} />
              </div>
              <LocalizationEditor label="Description" multiline value={b.description} onChange={(v) => up({ description: v })} />
              <RefListEditor label="Buffs" kind="buff" values={b.buffRefs} onChange={(v) => up({ buffRefs: v })} />
              <RefListEditor label="Custom interactions" kind="interaction" values={b.interactionRefs} onChange={(v) => up({ interactionRefs: v })} />
              <RefListEditor label="Custom statistics" kind="statistic" values={b.statisticRefs} onChange={(v) => up({ statisticRefs: v })} />
              <ListEditor
                label="Strength tiers" items={b.tiers} onChange={(v) => up({ tiers: v })} addLabel="Add tier"
                create={() => ({ id: rid(), name: "New tier", strength: 1, buffRefs: [], notes: "" })}
                renderTitle={(t) => `${t.name} · ${t.strength}`}
                renderBody={(t, tu) => (
                  <>
                    <Grid cols={3}>
                      <TextField label="Tier name" value={t.name} onChange={(v) => tu({ name: v })} />
                      <NumField label="Strength" value={t.strength} onChange={(v) => tu({ strength: v })} />
                      <TextField label="Notes" value={t.notes} onChange={(v) => tu({ notes: v })} />
                    </Grid>
                    <RefListEditor label="Tier buffs" kind="buff" values={t.buffRefs} onChange={(v) => tu({ buffRefs: v })} />
                  </>
                )}
              />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Legacy scoring" defaultOpen={false}>
        <ListEditor
          label="Scoring rules" items={data.scoring} onChange={(v) => setData({ scoring: v })} addLabel="Add rule"
          create={() => ({ id: rid(), event: "birth", points: 10, multiplier: 1, perGenerationCap: 0, scope: "dynasty", hidden: false, conditions: emptyConditionGroup() })}
          renderTitle={(s) => `${s.event} · ${s.points > 0 ? "+" : ""}${s.points}`}
          renderBody={(s, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Event" value={s.event} onChange={(v) => up({ event: v })} hint="birth, marriage, career completion…" />
                <NumField label="Points" value={s.points} onChange={(v) => up({ points: v })} />
                <NumField label="Multiplier" value={s.multiplier} step={0.1} onChange={(v) => up({ multiplier: v })} />
                <NumField label="Per-generation cap" value={s.perGenerationCap} onChange={(v) => up({ perGenerationCap: v })} />
                <SelectField label="Scope" value={s.scope} onChange={(v) => up({ scope: v })}
                  options={[{ value: "sim", label: "Individual Sim" }, { value: "household", label: "Household" }, { value: "dynasty", label: "Dynasty" }]} />
              </Grid>
              <BoolField label="Hidden scoring" value={s.hidden} onChange={(v) => up({ hidden: v })} />
              <ConditionGroupBuilder label="Conditions" value={s.conditions} onChange={(v) => up({ conditions: v })} />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Legacy events" defaultOpen={false}>
        <ListEditor
          label="Events" items={data.events} onChange={(v) => setData({ events: v })} addLabel="Add event"
          create={() => ({ id: rid(), kind: "heir-chosen", triggers: emptyConditionGroup(), loot: [], notification: emptyNotify("MC6_LEGACY_EVT") })}
          renderTitle={(e) => e.kind}
          renderBody={(e, up) => (
            <>
              <TextField label="Event kind" value={e.kind} onChange={(v) => up({ kind: v })} hint="founder-created, heir-chosen, generation-completed…" />
              <ConditionGroupBuilder label="Triggers" value={e.triggers} onChange={(v) => up({ triggers: v })} />
              <LootActionBuilder value={e.loot} onChange={(v) => up({ loot: v })} />
              <NotificationEditor value={e.notification} onChange={(v) => up({ notification: v })} keyPrefix="MC6_LEGACY_EVT" />
            </>
          )}
        />
      </PackSection>

      <PackSection title="Legacy preview">
        <div className="rounded-lg bg-gradient-to-b from-[#12291f] to-[#050f0a] p-3 text-white">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold">{data.dynastyName || "Goth"} Legacy</span>
            <span className="text-[11px] text-white/70">Generation {data.startingGeneration} of {data.maxGenerations}</span>
            <span className="ml-auto text-[11px] text-white/70">Score {data.scoring.reduce((n, s) => n + s.points, 0)}</span>
          </div>
          <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
            <div>
              <div className="text-[9.5px] uppercase tracking-widest text-[#86efac]/70">Founder</div>
              <div>{data.founder || "Mortimer Goth"}</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-widest text-[#86efac]/70">Current heir</div>
              <div>Bella Goth</div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-widest text-[#86efac]/70">Generation goals</div>
              {(data.generations[0]?.goals ?? []).slice(0, 4).map((g) => <div key={g.id}>{g.text}</div>)}
              {!(data.generations[0]?.goals ?? []).length && <div className="text-white/50">No goals configured</div>}
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-widest text-[#86efac]/70">Bloodlines</div>
              {data.bloodlines.length === 0 && <div className="text-white/50">None</div>}
              {data.bloodlines.slice(0, 4).map((b) => <div key={b.id}>{b.name} · {b.inheritanceChance}%</div>)}
            </div>
          </div>
          <div className="mt-2 rounded-md border border-[#86efac]/40 bg-[#0f2318]/70 p-2">
            <div className="text-[12px] font-semibold">Bella Goth has been named heir to the Goth family legacy.</div>
            <div className="text-[11px] text-white/75">Generation 2 goals are now active for the household.</div>
          </div>
          <div className="mt-2 rounded-md border border-dashed border-white/25 p-3 text-center text-[10.5px] text-white/60">
            Family tree view — structured records are stored; visual tree connects to save-game data in the desktop build.
          </div>
        </div>
      </PackSection>
    </>
  );
}

/* ------------------------ Pack mechanics -------------------------- */

function PackMechanicEditor({ data, setData, issues }: EditorProps<PackMechanicModuleData>) {
  const pack = findPack(data.packKey);
  const mech = pack?.mechanics.find((m) => m.key === data.mechanicCategory);
  return (
    <>
      <PackSection title="Pack selector">
        <Grid cols={3}>
          <SelectField label="Pack tier" value={data.packTier} onChange={(v) => setData({ packTier: v })}
            options={(Object.keys(PACK_TIER_LABEL) as (keyof typeof PACK_TIER_LABEL)[]).map((k) => ({ value: k, label: PACK_TIER_LABEL[k] }))} />
          <SelectField label="Pack" value={data.packKey} onChange={(v) => {
            const p = findPack(v);
            setData({ packKey: v, packLabel: p?.label ?? "", packTier: p?.tier ?? data.packTier, mechanicCategory: "" });
          }}
            options={[{ value: "", label: "Select pack…" }, ...PACK_CATALOG.map((p) => ({ value: p.key, label: `${p.label} (${p.code})` }))]} />
          <SelectField label="Mechanic category" value={data.mechanicCategory} onChange={(v) => {
            const m = pack?.mechanics.find((x) => x.key === v);
            setData({ mechanicCategory: v, requiredResourceTypes: m?.resourceTypes ?? [] });
          }}
            options={[{ value: "", label: "Select mechanic…" }, ...(pack?.mechanics ?? []).map((m) => ({ value: m.key, label: m.label }))]} />
          <TextField label="Patch version" value={data.patchVersion} onChange={(v) => setData({ patchVersion: v })} />
          <TextField label="Compatibility notes" value={data.compatibilityNotes} onChange={(v) => setData({ compatibilityNotes: v })} />
          <TextField label="Conflict warnings" value={data.conflictWarnings} onChange={(v) => setData({ conflictWarnings: v })} />
        </Grid>
        {mech && <p className="mt-2 text-[11px] text-muted-foreground">{mech.description}</p>}
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <TokenListField label="Required resource types" values={data.requiredResourceTypes} onChange={(v) => setData({ requiredResourceTypes: v })} />
          <TokenListField label="Optional dependencies" values={data.optionalDependencies} onChange={(v) => setData({ optionalDependencies: v })} />
        </div>
        <div className="mt-2">
          <RefListEditor label="Required tuning references" kind="any" values={data.requiredTuningRefs} onChange={(v) => setData({ requiredTuningRefs: v })} />
        </div>
        {fieldError(issues, "data.packKey") && <p className="mt-1 text-[10.5px] text-destructive">{fieldError(issues, "data.packKey")}</p>}
        {fieldError(issues, "data.mechanicCategory") && <p className="text-[10.5px] text-destructive">{fieldError(issues, "data.mechanicCategory")}</p>}
      </PackSection>

      <PackSection title="Mechanic rules">
        <ListEditor
          label="Rules" items={data.rules} onChange={(v) => setData({ rules: v })} addLabel="Add rule"
          create={() => ({
            id: rid(), name: "New rule", category: data.mechanicCategory, description: emptyLoc("MC6_PACK_RULE"),
            conditions: emptyConditionGroup(), loot: [], notification: emptyNotify("MC6_PACK_RULE"),
            fields: Object.fromEntries((mech?.fields ?? []).map((f) => [f.key, f.type === "boolean" ? false : f.type === "number" ? 0 : ""])),
            refs: [], enabled: true,
          })}
          renderTitle={(r) => r.name}
          renderBody={(r, up) => (
            <>
              <Grid cols={3}>
                <TextField label="Rule name" value={r.name} onChange={(v) => up({ name: v })} />
                <TextField label="Category" value={r.category} onChange={(v) => up({ category: v })} />
              </Grid>
              <BoolField label="Enabled" value={r.enabled} onChange={(v) => up({ enabled: v })} />
              <LocalizationEditor label="Description" multiline value={r.description} onChange={(v) => up({ description: v })} />
              {mech && mech.fields.length > 0 && (
                <Grid cols={3}>
                  {mech.fields.map((f) => {
                    const val = r.fields[f.key];
                    if (f.type === "boolean") return <BoolField key={f.key} label={f.label} value={Boolean(val)} onChange={(v) => up({ fields: { ...r.fields, [f.key]: v } })} />;
                    if (f.type === "number") return <NumField key={f.key} label={f.label} value={Number(val ?? 0)} onChange={(v) => up({ fields: { ...r.fields, [f.key]: v } })} />;
                    if (f.type === "select") return (
                      <SelectField key={f.key} label={f.label} value={String(val ?? "")} onChange={(v) => up({ fields: { ...r.fields, [f.key]: v } })}
                        options={[{ value: "", label: "—" }, ...(f.options ?? []).map((o) => ({ value: o, label: o }))]} />
                    );
                    return <TextField key={f.key} label={f.label} value={String(val ?? "")} onChange={(v) => up({ fields: { ...r.fields, [f.key]: v } })} />;
                  })}
                </Grid>
              )}
              <RefListEditor label="Linked resources" kind="any" values={r.refs} onChange={(v) => up({ refs: v })} />
              <ConditionGroupBuilder label="Conditions / tests" value={r.conditions} onChange={(v) => up({ conditions: v })} />
              <LootActionBuilder value={r.loot} onChange={(v) => up({ loot: v })} />
              <NotificationEditor value={r.notification} onChange={(v) => up({ notification: v })} keyPrefix="MC6_PACK_RULE" />
            </>
          )}
        />
      </PackSection>
    </>
  );
}
