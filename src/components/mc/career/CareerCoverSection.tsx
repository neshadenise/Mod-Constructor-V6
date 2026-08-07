/**
 * Career Cover — big Sims-style promotional artwork for a career and each of
 * its branches.
 *
 * Everything is decorative: the cover shows up in every in-builder preview and
 * ships with the exported package as a fitted 1024×512 master plus derived
 * display sizes. Uploads and AI generations are auto-fitted with a
 * subject-aware crop, and can be nudged with pan / zoom / rotate.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Crop,
  History,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  SquareDashed,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CAMERA_ANGLES,
  COVER_SIZES,
  MOODS,
  TIMES_OF_DAY,
  buildCoverAsset,
  buildCoverPrompt,
  emptyCoverSet,
  fileToDataUrl,
  generateCover,
  refitCoverAsset,
  resolveCover,
  type CoverAsset,
  type CoverPromptContext,
  type CoverPromptOptions,
  type CoverSet,
  type CoverTransform,
} from "@/lib/cover";

export function CareerCoverSection({
  context,
  branches,
  activeBranchId,
  value,
  onChange,
  advanced = false,
}: {
  /** Career-level facts used to build the AI prompt. */
  context: CoverPromptContext;
  branches: { id: string; name: string }[];
  activeBranchId?: string;
  value: CoverSet | undefined;
  onChange: (next: CoverSet) => void;
  advanced?: boolean;
}) {
  const set = value ?? emptyCoverSet();
  const [open, setOpen] = useState(true);
  const [scope, setScope] = useState<string>("career");
  const [busy, setBusy] = useState<null | "generate" | "process">(null);
  const [showCrop, setShowCrop] = useState(false);
  const [showSafe, setShowSafe] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [options, setOptions] = useState<CoverPromptOptions>({});
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Follow the branch the builder is editing.
  useEffect(() => {
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) setScope(activeBranchId);
  }, [activeBranchId, branches]);

  const branchName = branches.find((b) => b.id === scope)?.name;
  const scopedContext: CoverPromptContext = useMemo(
    () => (scope === "career" ? context : { ...context, branchName }),
    [context, scope, branchName],
  );

  const autoPrompt = useMemo(
    () => buildCoverPrompt(scopedContext, options),
    [scopedContext, options],
  );
  const prompt = promptOverride ?? autoPrompt;

  const own = scope === "career" ? set.career : set.branches[scope];
  const effective = scope === "career" ? set.career : resolveCover(set, scope);
  const inherited = !own && !!effective;

  const commit = (asset: CoverAsset | undefined, note?: string) => {
    const next: CoverSet = {
      career: set.career,
      branches: { ...set.branches },
      history: own && asset && own.id !== asset.id ? [own, ...set.history].slice(0, 12) : set.history,
    };
    if (scope === "career") next.career = asset;
    else if (asset) next.branches[scope] = asset;
    else delete next.branches[scope];
    onChange(next);
    if (note) toast.success(note);
  };

  /* ------------------------------ actions ------------------------------ */

  const generate = async () => {
    if (busy) return;
    setBusy("generate");
    try {
      const { dataUrl, provider } = await generateCover(prompt);
      const asset = await buildCoverAsset({ original: dataUrl, source: "ai", prompt, provider });
      commit(asset, `Cover generated for ${scope === "career" ? context.careerName || "career" : branchName}`);
    } catch (err) {
      toast.error("Couldn't generate cover art", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setBusy("process");
    try {
      const original = await fileToDataUrl(file);
      const asset = await buildCoverAsset({ original, source: "upload" });
      commit(asset, "Cover uploaded — auto-fitted to 1024×512");
    } catch (err) {
      toast.error("Couldn't read that image", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const applyTransform = async (patch: Partial<CoverTransform>) => {
    if (!own) return;
    setBusy("process");
    try {
      const next = { ...own.transform, ...patch, auto: false };
      const asset = await refitCoverAsset(own, next);
      commit(asset);
    } finally {
      setBusy(null);
    }
  };

  const resetAutoFit = async () => {
    if (!own) return;
    setBusy("process");
    try {
      const asset = await buildCoverAsset({
        original: own.original,
        source: own.source,
        prompt: own.prompt,
        provider: own.provider,
        id: own.id,
      });
      commit(asset, "Restored automatic fit");
    } finally {
      setBusy(null);
    }
  };

  const restore = async (asset: CoverAsset) => {
    commit(asset, "Previous cover restored");
    setShowHistory(false);
  };

  const t = own?.transform;

  /* -------------------------------- view -------------------------------- */

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-accent/40"
      >
        <ImagePlus className="h-3.5 w-3.5 text-[var(--teal)]" />
        <span className="text-[12px] font-semibold">Career Cover</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          1024 × 512
        </span>
        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {/* Scope tabs — career + every branch */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[{ id: "career", name: "Main Career" }, ...branches].map((s) => {
              const has = s.id === "career" ? !!set.career : !!set.branches[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setScope(s.id);
                    setPromptOverride(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    scope === s.id
                      ? "border-[var(--teal)] bg-[var(--teal)]/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  {s.name || "Untitled Branch"}
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      has ? "bg-[var(--teal)]" : "bg-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Big preview */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            className="relative w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted/30"
            style={{ aspectRatio: "2 / 1" }}
          >
            {effective ? (
              <img
                src={effective.master}
                alt={`${scope === "career" ? context.careerName : branchName} cover preview`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                <ImagePlus className="h-7 w-7" />
                <span>Drop an image here, upload one, or generate promotional art</span>
              </div>
            )}

            {showSafe && effective && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-[8%_6%] rounded border border-dashed border-white/60" />
                <span className="absolute left-[6%] top-[8%] -translate-y-full pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 drop-shadow">
                  Safe area
                </span>
              </div>
            )}

            {inherited && (
              <span className="absolute right-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Inherited from main career
              </span>
            )}

            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/75">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--teal)]" />
                <span className="text-[11px] text-muted-foreground">
                  {busy === "generate" ? "Painting cover art…" : "Fitting image…"}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Btn primary onClick={generate} disabled={!!busy} icon={Sparkles}>
              Generate with AI
            </Btn>
            <Btn onClick={() => fileRef.current?.click()} disabled={!!busy} icon={Upload}>
              {own ? "Replace" : "Upload Image"}
            </Btn>
            <Btn onClick={() => setShowCrop((v) => !v)} disabled={!own || !!busy} icon={Crop}>
              Crop
            </Btn>
            <Btn onClick={() => void resetAutoFit()} disabled={!own || !!busy} icon={RotateCcw}>
              Reset
            </Btn>
            <Btn
              onClick={() => setShowSafe((v) => !v)}
              icon={SquareDashed}
              active={showSafe}
            >
              Safe Area
            </Btn>
            {own && (
              <Btn onClick={() => commit(undefined, "Cover removed")} disabled={!!busy} icon={Trash2}>
                Remove
              </Btn>
            )}
            {set.history.length > 0 && (
              <Btn onClick={() => setShowHistory((v) => !v)} icon={History}>
                Previous ({set.history.length})
              </Btn>
            )}
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Master 1024×512 · derived {COVER_SIZES.filter((s) => s.key !== "builder")
              .map((s) => `${s.width}×${s.height}`)
              .join(" · ")} · covers are decorative and ship with the package.
            {!own && branches.length > 0 && scope !== "career"
              ? " This branch inherits the main career cover until you give it one."
              : ""}
          </p>

          {/* Crop / fit controls */}
          {showCrop && own && t && (
            <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Slider
                label={`Zoom ${t.zoom.toFixed(2)}×`}
                min={1}
                max={3}
                step={0.02}
                value={t.zoom}
                onCommit={(v) => void applyTransform({ zoom: v })}
              />
              <Slider
                label={`Pan X ${t.offsetX.toFixed(2)}`}
                min={-1}
                max={1}
                step={0.02}
                value={t.offsetX}
                onCommit={(v) => void applyTransform({ offsetX: v })}
              />
              <Slider
                label={`Pan Y ${t.offsetY.toFixed(2)}`}
                min={-1}
                max={1}
                step={0.02}
                value={t.offsetY}
                onCommit={(v) => void applyTransform({ offsetY: v })}
              />
              <Slider
                label={`Rotate ${t.rotate.toFixed(0)}°`}
                min={-15}
                max={15}
                step={1}
                value={t.rotate}
                onCommit={(v) => void applyTransform({ rotate: v })}
              />
              <div className="col-span-2 flex items-end">
                <button
                  onClick={() => void resetAutoFit()}
                  className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent"
                >
                  Reset to Auto Fit
                </button>
                <span className="ml-2 self-center text-[10px] text-muted-foreground">
                  {t.auto ? "Smart crop active" : "Manual framing"}
                </span>
              </div>
            </div>
          )}

          {/* Derivative strip */}
          {effective && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {COVER_SIZES.map((s) => (
                <div key={s.key} className="text-center">
                  <img
                    src={effective.derivatives[s.key] ?? effective.master}
                    alt={`${s.label} ${s.width}×${s.height}`}
                    className="rounded border border-border object-cover"
                    style={{ width: Math.min(160, s.width / 2), aspectRatio: "2 / 1" }}
                  />
                  <div className="mt-1 text-[9px] text-muted-foreground">
                    {s.label} · {s.width}×{s.height}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History */}
          {showHistory && set.history.length > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Previous versions
              </div>
              <div className="flex flex-wrap gap-2">
                {set.history.map((h) => (
                  <button
                    key={`${h.id}-${h.createdAt}`}
                    onClick={() => void restore(h)}
                    className="overflow-hidden rounded border border-border hover:border-[var(--teal)]"
                    title={new Date(h.createdAt).toLocaleString()}
                  >
                    <img src={h.derivatives.thumb ?? h.master} alt="Previous cover" className="w-32" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt editor */}
          <div className="mt-3 rounded-lg border border-border">
            <button
              onClick={() => setShowPrompt((v) => !v)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/40"
            >
              <Wand2 className="h-3 w-3 text-[var(--violet,var(--teal))]" />
              <span className="text-[11px] font-semibold">AI Prompt Editor</span>
              <span className="text-[10px] text-muted-foreground">
                {promptOverride ? "custom" : "auto from career data"}
              </span>
              <ChevronDown
                className={cn("ml-auto h-3 w-3 transition-transform", showPrompt && "rotate-180")}
              />
            </button>
            {showPrompt && (
              <div className="border-t border-border p-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <Text label="Scene Focus" value={options.sceneFocus} onChange={(v) => setOptions({ ...options, sceneFocus: v })} />
                  <Num label="Number of Sims" value={options.simCount ?? 3} onChange={(v) => setOptions({ ...options, simCount: v })} />
                  <Select label="Time of Day" value={options.timeOfDay ?? "Auto"} options={TIMES_OF_DAY} onChange={(v) => setOptions({ ...options, timeOfDay: v })} />
                  <Select label="Setting" value={options.setting ?? "Auto"} options={["Auto", "Indoor", "Outdoor"]} onChange={(v) => setOptions({ ...options, setting: v as CoverPromptOptions["setting"] })} />
                  <Select label="Mood" value={options.mood ?? "Auto"} options={MOODS} onChange={(v) => setOptions({ ...options, mood: v })} />
                  <Select label="Camera Angle" value={options.cameraAngle ?? CAMERA_ANGLES[0]} options={[...CAMERA_ANGLES]} onChange={(v) => setOptions({ ...options, cameraAngle: v })} />
                  <Text label="Environment Details" value={options.environment} onChange={(v) => setOptions({ ...options, environment: v })} />
                  <Text label="Clothing Style" value={options.clothingStyle} onChange={(v) => setOptions({ ...options, clothingStyle: v })} />
                  <Text label="Diversity Preferences" value={options.diversity} onChange={(v) => setOptions({ ...options, diversity: v })} />
                  <Text label="Prop Emphasis" value={options.props} onChange={(v) => setOptions({ ...options, props: v })} />
                  <Text label="Weather" value={options.weather} onChange={(v) => setOptions({ ...options, weather: v })} />
                  <Text label="Lighting" value={options.lighting} onChange={(v) => setOptions({ ...options, lighting: v })} />
                  <div className="col-span-3">
                    <Text label="Additional Instructions" value={options.extra} onChange={(v) => setOptions({ ...options, extra: v })} />
                  </div>
                </div>

                <label className="mb-1 mt-3 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Final prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPromptOverride(e.target.value)}
                  className="h-28 w-full resize-none rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPromptOverride(null);
                      setOptions({});
                      toast.message("Prompt reset from career data");
                    }}
                    className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent"
                  >
                    Reset to Auto
                  </button>
                  <Btn primary onClick={generate} disabled={!!busy} icon={Sparkles}>
                    Generate with this prompt
                  </Btn>
                </div>
                {advanced && own?.prompt && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Current image prompt: {own.prompt.slice(0, 180)}…
                  </p>
                )}
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </section>
  );
}

/* ------------------------------ tiny controls ---------------------------- */

function Btn({
  children,
  onClick,
  disabled,
  primary,
  active,
  icon: Icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  active?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50",
        primary
          ? "bg-[var(--teal)] text-white hover:opacity-90"
          : active
            ? "border border-[var(--teal)] bg-[var(--teal)]/10 text-foreground"
            : "border border-border bg-card hover:bg-accent",
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onCommit,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onMouseUp={() => onCommit(local)}
        onTouchEnd={() => onCommit(local)}
        onKeyUp={() => onCommit(local)}
        className="w-full accent-[var(--teal)]"
      />
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Auto"
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px]"
      />
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type="number"
        min={1}
        max={8}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px]"
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
