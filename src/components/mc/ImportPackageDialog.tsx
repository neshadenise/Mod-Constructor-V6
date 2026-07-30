import { useRef, useState } from "react";
import { Upload, FolderPlus, FolderInput, Package } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import type { ProjectBundle } from "@/lib/types";
import { cn } from "@/lib/utils";

type Parsed = { bundle: ProjectBundle; filename: string };

function counts(b: ProjectBundle) {
  return [
    ["Careers", b.careers?.length ?? 0],
    ["Traits", b.traits?.length ?? 0],
    ["Aspirations", b.aspirations?.length ?? 0],
    ["Notifications", b.notifications?.length ?? 0],
    ["Assets", b.assets?.length ?? 0],
    ["Pack modules", b.packModules?.length ?? 0],
  ] as const;
}

/**
 * Import a .mcbundle.json package either as a NEW project or merged INTO an
 * existing project. Trigger by rendering this and calling the returned opener.
 */
export function useImportPackage() {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pickFile = () => {
    const input = inputRef.current ?? document.createElement("input");
    inputRef.current = input;
    input.type = "file";
    input.accept = "application/json,.mcbundle.json,.json";
    input.value = "";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const bundle = JSON.parse(await file.text()) as ProjectBundle;
        if (!bundle?.project) throw new Error("Missing project data");
        setParsed({ bundle, filename: file.name });
      } catch (e) {
        toast.error(`That file is not a valid .mcbundle.json`, {
          description: String((e as Error)?.message ?? e),
        });
      }
    };
    input.click();
  };

  return {
    openImport: pickFile,
    dialog: <ImportPackageDialog parsed={parsed} onClose={() => setParsed(null)} />,
  };
}

function ImportPackageDialog({ parsed, onClose }: { parsed: Parsed | null; onClose: () => void }) {
  const store = useStore();
  const projects = store.state.projects;
  const [targetId, setTargetId] = useState<string>("");
  const active = store.state.activeProjectId ?? projects[0]?.id ?? "";
  const target = targetId || active;

  if (!parsed) return null;
  const { bundle, filename } = parsed;

  const asNew = () => {
    const p = store.importBundle(bundle);
    store.setActiveProject(p.id);
    toast.success(`Imported "${p.name}" as a new project`);
    onClose();
  };

  const intoProject = () => {
    try {
      const { project, added } = store.mergeBundleIntoProject(bundle, target);
      const total = Object.values(added).reduce((a, b) => a + b, 0);
      toast.success(`Added ${total} item${total === 1 ? "" : "s"} to "${project.name}"`, {
        description: counts(bundle)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${n} ${k.toLowerCase()}`)
          .join(" · "),
      });
      onClose();
    } catch (e) {
      toast.error(String((e as Error)?.message ?? e));
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[var(--orange)]" /> Import package
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px]">{filename}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-sm font-semibold">{bundle.project?.name ?? "Untitled"}</div>
          <div className="text-[11px] text-muted-foreground">
            v{bundle.project?.version ?? "0.1.0"} · bundle v{bundle.version ?? 1}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {counts(bundle).map(([label, n]) => (
              <div key={label} className="rounded-md border border-border bg-card px-2 py-1">
                <div className="text-sm font-bold tabular-nums">{n}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Where should it go?
          </div>

          <button
            onClick={intoProject}
            disabled={!projects.length}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent",
              !projects.length && "pointer-events-none opacity-50",
            )}
          >
            <FolderInput className="mt-0.5 h-4 w-4 text-[var(--blue)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Add to an existing project</span>
              <span className="block text-[11px] text-muted-foreground">
                Merges careers, traits, aspirations, notifications, assets and pack modules into the
                selected project. Duplicate names get numbered.
              </span>
            </span>
          </button>

          <select
            value={target}
            onChange={(e) => setTargetId(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.id === active ? "(active)" : ""}
              </option>
            ))}
          </select>

          <button
            onClick={asNew}
            className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
          >
            <FolderPlus className="mt-0.5 h-4 w-4 text-[var(--green)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Create a new project</span>
              <span className="block text-[11px] text-muted-foreground">
                Imports the package as its own separate project and makes it active.
              </span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Upload className="h-3 w-3" /> Nothing is uploaded — the package is read on this device.
        </div>
      </DialogContent>
    </Dialog>
  );
}
