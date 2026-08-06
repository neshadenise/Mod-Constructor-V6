/**
 * Dynasty library landing.
 *
 * Lists every custom organization type in the active project with its health,
 * compatibility requirements and the three-way separation summarised on the
 * card: bloodline, membership, hierarchy.
 */

import { useMemo, useState } from "react";
import { Copy, Crown, Plus, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge, Btn, Chip, EmptyHint, Panel, TextInput } from "@/components/mc/trait/primitives";
import { useDynastyLibrary } from "@/lib/dynasty/store";
import { validateAll } from "@/lib/dynasty/validate";
import { requirementSummary } from "@/lib/dynasty/ids";
import { DYNASTY_TEMPLATES, TEMPLATE_GROUPS, buildFromTemplate } from "@/lib/dynasty/templates";
import {
  COMPAT_MODE_LABEL, MEMBERSHIP_STRUCTURE_LABEL, REQUIREMENT_LABEL, completeness,
  leadershipRoles, type DynastyDoc,
} from "@/lib/dynasty/schema";
import { useActiveProject } from "@/lib/store";

export function DynastyLanding({ onOpen }: { onOpen: (uuid: string) => void }) {
  const project = useActiveProject();
  const lib = useDynastyLibrary();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");

  const validations = useMemo(() => validateAll(lib.docs, {}), [lib.docs]);

  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lib.docs.filter(
      (d) =>
        !q ||
        d.identity.typeName.toLowerCase().includes(q) ||
        d.identity.description.toLowerCase().includes(q) ||
        d.terms.organization.toLowerCase().includes(q),
    );
  }, [lib.docs, query]);

  const templates = DYNASTY_TEMPLATES.filter((t) => group === "all" || t.group === group);

  const createFrom = (templateId: string) => {
    const t = DYNASTY_TEMPLATES.find((x) => x.id === templateId);
    if (!t || !project) return;
    const doc = buildFromTemplate(t, lib.namespace, project.id);
    lib.create(doc);
    toast.success(`${t.label} created`, { description: "EA's dynasty tuning is referenced, never modified." });
    onOpen(doc.uuid);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Crown className="h-4.5 w-4.5 text-primary" /> Custom Dynasty Builder
          </h1>
          <p className="mt-1 max-w-[70ch] text-[12px] text-muted-foreground">
            Build new organization types on top of the Royalty &amp; Legacy framework. Bloodline
            (who descends from the founder), membership (who belongs) and hierarchy (what authority
            they hold) stay separate, so a coven, a crime family and a royal house each behave
            correctly. EA's dynasty resources are referenced, never overridden.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizations"
              className="w-56 pl-7"
            />
          </div>
          <Btn icon={Plus} variant="primary" onClick={() => createFrom("blank")}>
            New organization
          </Btn>
        </div>
      </header>

      {docs.length === 0 ? (
        <EmptyHint>
          No custom organization types in this project yet. Start from a template below.
        </EmptyHint>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <DynastyCard
              key={doc.uuid}
              doc={doc}
              health={validations.get(doc.uuid)?.health ?? 0}
              blocking={validations.get(doc.uuid)?.counts.blocking ?? 0}
              eaSafe={validations.get(doc.uuid)?.eaSafe ?? true}
              onOpen={() => onOpen(doc.uuid)}
              onDuplicate={() => {
                const copy = lib.duplicate(doc.uuid);
                if (copy) toast.success(`Duplicated as “${copy.identity.typeName}”`);
              }}
              onDelete={() => {
                const used = lib.usageOf(doc.uuid).length + lib.dependents(doc.uuid).length;
                lib.remove(doc.uuid);
                toast.success(`${doc.identity.typeName} deleted`, {
                  description: used ? `${used} reference${used === 1 ? "" : "s"} were cleared.` : undefined,
                });
              }}
            />
          ))}
        </div>
      )}

      <Panel
        title="Start from a template"
        subtitle="Each template pre-wires a hierarchy, membership rules and succession that suit that kind of organization."
        actions={
          <div className="flex flex-wrap gap-1">
            <Chip active={group === "all"} onClick={() => setGroup("all")}>All</Chip>
            {TEMPLATE_GROUPS.map((g) => (
              <Chip key={g} active={group === g} onClick={() => setGroup(g)}>{g}</Chip>
            ))}
          </div>
        }
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => createFrom(t.id)}
              className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold">{t.label}</span>
                <Badge>{t.group}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{t.blurb}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone="accent">{t.roles.length} roles</Badge>
                <Badge>{MEMBERSHIP_STRUCTURE_LABEL[t.structure]}</Badge>
                <Badge>{COMPAT_MODE_LABEL[t.compatMode]}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DynastyCard({
  doc, health, blocking, eaSafe, onOpen, onDuplicate, onDelete,
}: {
  doc: DynastyDoc;
  health: number;
  blocking: number;
  eaSafe: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const leaders = leadershipRoles(doc);
  const reqs = requirementSummary(doc);
  const pct = completeness(doc);

  return (
    <article className="group rounded-xl border border-border bg-card/60 p-3.5 transition-colors hover:border-primary/40">
      <header className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <h3 className="truncate text-[13px] font-semibold">{doc.identity.typeName}</h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {doc.terms.organization} · {doc.terms.leader}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Btn icon={Copy} onClick={onDuplicate} title="Duplicate" />
          <Btn icon={Trash2} variant="danger" onClick={onDelete} title="Delete" />
        </div>
      </header>

      {doc.identity.description && (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{doc.identity.description}</p>
      )}

      <dl className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
        <Stat label="Bloodline" value={doc.bloodline.enabled ? `${doc.bloodline.generationsTracked} gen` : "Off"} />
        <Stat label="Membership" value={`${doc.membershipTypes.length} types`} />
        <Stat label="Hierarchy" value={`${doc.hierarchy.roles.length} roles`} />
      </dl>

      <div className="mt-2.5 flex flex-wrap gap-1">
        <Badge tone={eaSafe ? "ok" : "error"}>
          <ShieldCheck className="h-3 w-3" /> {eaSafe ? "EA-safe" : "EA conflict"}
        </Badge>
        <Badge tone={blocking ? "error" : health >= 85 ? "ok" : "warn"}>
          {blocking ? `${blocking} blocking` : `Health ${health}`}
        </Badge>
        <Badge><Users className="h-3 w-3" /> {leaders.length || "no"} leadership</Badge>
        {reqs.map((r) => (
          <Badge key={r} tone="muted">{REQUIREMENT_LABEL[r]}</Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", pct >= 80 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10.5px] tabular-nums text-muted-foreground">{pct}%</span>
        <Btn variant="primary" onClick={onOpen}>Open</Btn>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <dt className="text-[9.5px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-[11.5px] font-semibold">{value}</dd>
    </div>
  );
}
