/**
 * CoverImageField — 16:9 career/aspiration cover art.
 *
 * Matches the in-game "Select a Career" panel, which uses a wide cinematic
 * still above the career description. Uploads are center-cropped to 16:9
 * automatically so creators never have to open an image editor, and the
 * "Generate with AI" button paints one in the shared life-sim art style.
 */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { coverPrompt, cropToAspect, generateArt } from "@/lib/ai-art";

export function CoverImageField({
  label = "Cover Image",
  value,
  onChange,
  subject,
  hint = "16:9 — shown on the career select panel. Uploads are auto-cropped.",
}: {
  label?: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  /** Used as the AI prompt subject, e.g. the career name. */
  subject?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await cropToAspect(file, 16 / 9, 1280);
      if (!dataUrl) {
        toast.error("Couldn't read that image");
        return;
      }
      onChange(dataUrl);
      toast.success("Cover image added", { description: "Cropped to 16:9 automatically." });
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const dataUrl = await generateArt(
        coverPrompt(subject ? `${subject} career, sims at work` : ""),
      );
      onChange(dataUrl);
      toast.success("Cover art generated");
    } catch (err) {
      toast.error("Couldn't generate cover art", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted/30"
      >
        {value ? (
          <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
            <span>Drop an image here, upload, or generate one</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--teal)]" />
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--teal)] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Wand2 className="h-3 w-3" />
          Add image with AI
        </button>
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent disabled:opacity-60"
        >
          <Upload className="h-3 w-3" />
          Add photo
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              toast.message(`${label} cleared`);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
