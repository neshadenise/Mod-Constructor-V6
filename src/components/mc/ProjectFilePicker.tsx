/**
 * ProjectFilePicker — "Choose from Project Files".
 *
 * Lets any builder asset field pick an image that lives in the active
 * project's Explorer. The returned value is `file:<stable item id>`, so
 * renaming or moving the file never breaks the builder reference.
 */
import { useMemo, useState } from "react";
import { Search, FolderTree } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import {
  useExplorer, isPreviewableImage, fileCategory, formatBytes, serializeFileRef,
  type ProjectExplorerItem,
} from "@/lib/explorer";

export function ProjectFilePicker({
  open,
  onClose,
  onPick,
  imagesOnly = true,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ref: string, item: ProjectExplorerItem) => void;
  imagesOnly?: boolean;
}) {
  const store = useStore();
  const ex = useExplorer();
  const projectId = store.state.activeProjectId;
  const [q, setQ] = useState("");

  const files = useMemo(() => {
    if (!projectId) return [];
    return ex
      .listProject(projectId)
      .filter((i) => i.itemType === "file")
      .filter((i) => (imagesOnly ? isPreviewableImage(i) : true))
      .filter((i) => !q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()));
  }, [ex, projectId, imagesOnly, q]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose from Project Files</DialogTitle>
          <DialogDescription>Files stored in this project's Explorer.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project files..." className="h-8 pl-7 text-xs" />
        </div>
        <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">
          {files.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center text-xs text-muted-foreground">
              <FolderTree className="h-6 w-6" />
              No matching files in this project yet. Upload some in the Project Explorer.
            </div>
          )}
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => { onPick(serializeFileRef(f.id), f); onClose(); }}
              className={cn("flex flex-col gap-1 rounded-lg border border-border p-2 text-left hover:bg-accent/60")}
            >
              <div className="flex h-16 items-center justify-center overflow-hidden rounded-md bg-muted/40">
                {isPreviewableImage(f) && f.dataUrl ? (
                  <img src={f.dataUrl} alt={f.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">{fileCategory(f)}</span>
                )}
              </div>
              <span className="truncate text-[11px] font-medium">{f.name}</span>
              <span className="text-[10px] text-muted-foreground">{formatBytes(f.size)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
