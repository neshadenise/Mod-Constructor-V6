/**
 * Rebuild imported packages from the files stored in the current project.
 *
 * Edits made to imported tuning XML / string tables in the Project Explorer are
 * folded back into the original .package; every untouched resource is copied
 * byte-for-byte.
 */
import { useMemo, useState } from "react";
import { Hammer, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useExplorer } from "@/lib/explorer";
import { collectImportedMods } from "@/lib/modimport/rebuild-from-project";
import { rebuildPackages, type RebuiltPackage } from "@/lib/modimport/rebuild";
import { downloadBytes } from "@/lib/modimport/export";

export default function RebuildImportedPanel({ projectId }: { projectId: string }) {
  const ex = useExplorer();
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RebuiltPackage[]>>({});

  const mods = useMemo(
    () => collectImportedMods(ex.items, projectId),
    [ex.items, projectId],
  );

  if (!mods.length) return null;

  const run = async (modId: string) => {
    const mod = mods.find((m) => m.id === modId);
    if (!mod) return;
    if (!mod.source.packages.size) {
      toast.error("No original package found", {
        description: "Save the imported mod to this project so its .package file is available for rebuilding.",
      });
      return;
    }
    setBusy(modId);
    try {
      const out = await rebuildPackages(mod.source);
      setResults((r) => ({ ...r, [modId]: out }));
      const edited = out.reduce((n, p) => n + p.editedResources, 0);
      const verbatim = out.reduce((n, p) => n + p.verbatimResources, 0);
      out.forEach((p) => downloadBytes(p.name, p.bytes, "application/octet-stream"));
      toast.success(`Rebuilt ${out.length} package${out.length === 1 ? "" : "s"}`, {
        description: `${edited} edited · ${verbatim} copied byte-for-byte`,
      });
    } catch (e) {
      toast.error("Rebuild failed", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Hammer className="h-4 w-4 text-[var(--teal)]" />
        <h3 className="text-sm font-semibold">Rebuild imported package</h3>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Folds your edits to imported tuning and string tables back into the original package.
        Anything you did not touch is copied through unchanged.
      </p>
      <div className="space-y-2">
        {mods.map((mod) => {
          const out = results[mod.id];
          return (
            <div key={mod.id} className="rounded-lg border border-border p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 text-xs font-medium">{mod.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {mod.source.manifest.resources.length} resources · {mod.source.packages.size} package
                  {mod.source.packages.size === 1 ? "" : "s"}
                  {mod.missingFiles ? ` · ${mod.missingFiles} deleted` : ""}
                </span>
                <Button size="sm" disabled={busy === mod.id} onClick={() => run(mod.id)}>
                  {busy === mod.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Rebuild
                </Button>
              </div>
              {out?.map((p) => (
                <div key={p.name} className="mt-2 space-y-1 border-t border-border pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {p.verified ? (
                      <ShieldCheck className="h-3 w-3 text-[var(--green)]" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-[var(--orange)]" />
                    )}
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">
                      {p.editedResources} edited · {p.verbatimResources} verbatim
                      {p.droppedResources ? ` · ${p.droppedResources} removed` : ""}
                    </span>
                  </div>
                  {p.warnings.map((w, i) => (
                    <div key={i} className="text-muted-foreground">
                      {w}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
