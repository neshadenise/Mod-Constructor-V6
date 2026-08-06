/**
 * Trait landing — the list of traits in the active project.
 *
 * Shows real state per trait (validation status, type, acquisition, effect
 * count) so a modder can tell at a glance which traits are safe to ship.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, FileDown, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { migrateTraitDoc } from "@/lib/traits/migrate";
import { traitTypeSpec, type TraitDoc } from "@/lib/traits/schema";
import { validateTrait } from "@/lib/traits/validate";
import type { ResolveContext } from "@/lib/traits/resolver";
import { Badge, Btn, EmptyHint, Panel, TextInput } from "./primitives";

export function TraitLanding({
  ctx,
  onOpen,
  onCreate,
  onDuplicate,
  onDelete,
  onExport,
}: {
  ctx: ResolveContext;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}) {
  const store = useStore();
  const project = useActiveProject();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const traits = store.state.traits.filter((t) => t.projectId === project?.id);
    return traits.map((t) => {
      const doc: TraitDoc = migrateTraitDoc(t);
      const v = validateTrait(doc, ctx, t.id);
      return { id: t.id, doc, v };
    });
  }, [store.state.traits, project?.id, ctx]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) =>
      [r.doc.displayName, r.doc.ids.internalName, r.doc.traitType, r.doc.category]
        .join(" ")
        .toLowerCase()
        .includes(n),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <Panel
        title="Traits"
        subtitle={`${rows.length} trait${rows.length === 1 ? "" : "s"} in ${project?.name ?? "this project"}. Status reflects real validation, not a guess.`}
        actions={
          <Btn icon={Plus} variant="primary" onClick={onCreate}>
            New trait
          </Btn>
        }
      >
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search traits…" className="pl-8" />
        </div>

        {filtered.length === 0 ? (
          <EmptyHint>
            {rows.length === 0
              ? "No traits yet. Create one to start — nothing is written to the project until you save."
              : "No traits match that search."}
          </EmptyHint>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {filtered.map(({ id, doc, v }) => {
              const spec = traitTypeSpec(doc.traitType);
              return (
                <div
                  key={id}
                  className={cn(
                    "rounded-lg border bg-background p-3 transition-colors hover:border-primary/40",
                    v.errors ? "border-red-500/40" : v.warnings ? "border-amber-500/30" : "border-border",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => onOpen(id)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{doc.displayName}</span>
                        <Badge tone="accent">{spec.label}</Badge>
                        {spec.usesCategory && <Badge>{doc.category}</Badge>}
                        {v.errors > 0 ? (
                          <Badge tone="error">
                            <AlertTriangle className="mr-1 inline h-3 w-3" />
                            {v.errors} error{v.errors === 1 ? "" : "s"}
                          </Badge>
                        ) : v.warnings > 0 ? (
                          <Badge tone="warn">{v.warnings} warning{v.warnings === 1 ? "" : "s"}</Badge>
                        ) : (
                          <Badge tone="ok">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            valid
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {doc.description || "No description."}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-mono">{doc.ids.namespace}:{doc.ids.internalName}</span>
                        <span>· {doc.effects.length} effect{doc.effects.length === 1 ? "" : "s"}</span>
                        <span>· {doc.eligibility.ages.length} age{doc.eligibility.ages.length === 1 ? "" : "s"}</span>
                        <span>· {doc.acquisition.methods.length} acquisition path{doc.acquisition.methods.length === 1 ? "" : "s"}</span>
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Btn icon={Copy} title="Duplicate" onClick={() => onDuplicate(id)}>{""}</Btn>
                      <Btn icon={FileDown} title="Export" onClick={() => onExport(id)}>{""}</Btn>
                      <Btn icon={Trash2} variant="danger" title="Delete" onClick={() => onDelete(id)}>{""}</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
