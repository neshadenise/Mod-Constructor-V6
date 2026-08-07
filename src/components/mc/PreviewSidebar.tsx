import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  PanelRightClose,
  PanelRightOpen,
  Sun,
  Moon,
  RefreshCw,
  ArrowUpRight,
  Monitor,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, useActiveProject } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import type { SectionId } from "./sections";
import {
  CareerCard,
  PromotionWindow,
  BranchWindow,
  TraitCard,
  BuffCard,
  AspirationCard,
  NotificationPopup,
  IconFrame,
  TooltipPreview,
  type NotificationKind,
} from "./preview/GameUI";

export const PREVIEW_WIDTH = 320;

/** Width the in-game cards are designed for; scaled down to fit the rail. */
const GAME_WIDTH = 460;

type PreviewKind = "career" | "trait" | "aspiration" | "notification" | "asset" | "project";

const SECTION_KIND: Partial<Record<SectionId, PreviewKind>> = {
  career: "career",
  trait: "trait",
  aspiration: "aspiration",
  notifications: "notification",
  icons: "asset",
  assets: "asset",
};

const KIND_LABEL: Record<PreviewKind, { label: string; to: SectionId }> = {
  career: { label: "Career", to: "career" },
  trait: { label: "Trait", to: "trait" },
  aspiration: { label: "Aspiration", to: "aspiration" },
  notification: { label: "Notification", to: "notifications" },
  asset: { label: "Asset", to: "assets" },
  project: { label: "Project", to: "projects" },
};

const SCENES: Record<PreviewKind, string[]> = {
  career: ["Career Panel", "Promotion", "Branches", "Notification"],
  trait: ["CAS Card", "Moodlet", "Tooltip", "Notification"],
  aspiration: ["Aspiration Panel", "Milestone", "Tooltip"],
  notification: ["Popup", "Compact"],
  asset: ["In-Game Icon"],
  project: ["Mod Summary"],
};

const MOOD_COLOR: Record<string, string> = {
  happy: "green",
  flirty: "pink",
  sad: "blue",
  angry: "red",
  confident: "violet",
  focused: "teal",
  playful: "orange",
  uncomfortable: "orange",
  bored: "blue",
  energized: "green",
  inspired: "violet",
  dazed: "pink",
  embarrassed: "pink",
  asleep: "blue",
  fine: "blue",
};

export function usePreviewPanel() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("mc.preview.panel") !== "closed";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mc.preview.panel", open ? "open" : "closed");
  }, [open]);
  return { open, setOpen };
}

/** Scales the fixed-width game canvas down into the narrow rail. */
function GameSurface({
  theme,
  nonce,
  children,
}: {
  theme: "light" | "dark";
  nonce: number;
  children: React.ReactNode;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const scale = (PREVIEW_WIDTH - 24) / GAME_WIDTH;

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    setH(el.offsetHeight);
    return () => ro.disconnect();
  }, [children, nonce]);

  return (
    <div
      data-preview-theme={theme}
      className={cn(
        "overflow-hidden rounded-xl border shadow-[0_18px_44px_-30px_rgba(15,23,42,0.6)]",
        theme === "dark"
          ? "border-white/10 bg-[oklch(0.22_0.04_260)] text-white"
          : "border-black/10 bg-[oklch(0.98_0.01_230)] text-[oklch(0.22_0.04_260)]",
      )}
    >
      <div className="flex items-center justify-between border-b border-black/5 bg-black/[0.03] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider opacity-70 [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/5">
        <span className="flex items-center gap-1">
          <Monitor className="h-2.5 w-2.5" /> In-Game
        </span>
        <span>{Math.round(scale * 100)}% · {theme}</span>
      </div>
      <div style={{ height: h * scale }} className="overflow-hidden">
        <div
          key={nonce}
          ref={inner}
          style={{ width: GAME_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="p-3"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function PreviewSidebar({
  active,
  open,
  onOpenChange,
}: {
  active: SectionId;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const store = useStore();
  const project = useActiveProject();
  const { navigate } = useAppNavigation();

  const sectionKind: PreviewKind = SECTION_KIND[active] ?? "project";
  /** On project-level screens the dropdown spans every builder in the mod. */
  const browsing = sectionKind === "project";

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [nonce, setNonce] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const records = useMemo(() => {
    const pid = project?.id;
    const scoped = <T extends { projectId?: string }>(rows: T[]) =>
      pid ? rows.filter((r) => r.projectId === pid) : [];
    const of = (k: PreviewKind, rows: { id: string; name: string }[]) =>
      rows.map((r) => ({ key: `${k}:${r.id}`, id: r.id, kind: k, name: r.name }));

    if (browsing)
      return [
        ...of("career", scoped(store.state.careers).map((c) => ({ id: c.id, name: c.name }))),
        ...of("trait", scoped(store.state.traits).map((t) => ({ id: t.id, name: t.name }))),
        ...of("aspiration", scoped(store.state.aspirations).map((a) => ({ id: a.id, name: a.name }))),
      ];
    if (sectionKind === "career") return of("career", scoped(store.state.careers).map((c) => ({ id: c.id, name: c.name })));
    if (sectionKind === "trait") return of("trait", scoped(store.state.traits).map((t) => ({ id: t.id, name: t.name })));
    if (sectionKind === "aspiration") return of("aspiration", scoped(store.state.aspirations).map((a) => ({ id: a.id, name: a.name })));
    if (sectionKind === "notification") return of("notification", scoped(store.state.notifications).map((n) => ({ id: n.id, name: n.name })));
    if (sectionKind === "asset") return of("asset", scoped(store.state.assets).map((a) => ({ id: a.id, name: a.name })));
    return [];
  }, [sectionKind, browsing, project?.id, store.state]);

  const [pickedKey, setPickedKey] = useState<string | null>(null);
  useEffect(() => setPickedKey(null), [sectionKind, project?.id]);

  const current = records.find((r) => r.key === pickedKey) ?? records[0] ?? null;
  const currentId = current?.id ?? null;
  const kind: PreviewKind = current?.kind ?? sectionKind;
  const meta = KIND_LABEL[kind];

  const [scene, setScene] = useState<string>(SCENES[kind][0]!);
  useEffect(() => setScene(SCENES[kind][0]!), [kind]);


  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        title="Show in-game preview"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-lg border border-r-0 border-border bg-card px-2 py-4 text-muted-foreground shadow-sm hover:text-foreground"
      >
        <PanelRightOpen className="h-4 w-4" />
        <span className="text-[10px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">
          Game Preview
        </span>
      </button>
    );
  }

  return (
    <aside
      className="fixed right-0 top-0 z-40 flex h-screen flex-col border-l border-border bg-card/60 backdrop-blur"
      style={{ width: PREVIEW_WIDTH }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[var(--blue)]" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Game Preview</div>
            <div className="text-[10px] text-muted-foreground">How it looks in-game</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setExpanded(true)}
            title="Open full-size game preview"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setNonce((n) => n + 1)}
            title="Replay preview"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            title="Toggle in-game skin"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            title="Hide preview"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {!project ? (
          <Empty text="Select a project to preview its content." />
        ) : (
          <>
            {records.length > 0 && (
              <select
                value={current?.key ?? ""}
                onChange={(e) => setPickedKey(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                {records.map((r) => (
                  <option key={r.key} value={r.key}>
                    {browsing ? `${KIND_LABEL[r.kind].label} · ${r.name}` : r.name}
                  </option>
                ))}
              </select>
            )}

            {SCENES[kind].length > 1 && (
              <div className="flex flex-wrap gap-1">
                {SCENES[kind].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScene(s)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                      s === scene
                        ? "border-transparent bg-foreground text-background"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <GameSurface theme={theme} nonce={nonce}>
              <Scene kind={kind} id={currentId} scene={scene} />
            </GameSurface>

            {kind !== "project" && (
              <button
                onClick={() => navigate(meta.to)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Open {meta.label} Builder <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Game Preview — {meta.label}</DialogTitle>
          </DialogHeader>
          <div
            data-preview-theme={theme}
            className={cn(
              "max-h-[70vh] overflow-y-auto rounded-xl border p-5",
              theme === "dark"
                ? "border-white/10 bg-[oklch(0.22_0.04_260)] text-white"
                : "border-black/10 bg-[oklch(0.98_0.01_230)] text-[oklch(0.22_0.04_260)]",
            )}
          >
            <div className="mx-auto" style={{ width: GAME_WIDTH }}>
              <Scene kind={kind} id={currentId} scene={scene} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

/* ------------------------- scene renderers ------------------------- */

function Scene({ kind, id, scene }: { kind: PreviewKind; id: string | null; scene: string }) {
  const store = useStore();
  const project = useActiveProject();

  if (kind === "career") {
    const c = store.state.careers.find((r) => r.id === id);
    if (!c) return <GameEmpty text="No careers yet — create one to see it in game." />;
    const branch = c.branches[0];
    const levels = branch?.levels ?? [];
    const lvl = levels[Math.min(2, Math.max(0, levels.length - 1))];
    const prev = levels[Math.max(0, (levels.indexOf(lvl!) || 0) - 1)];
    const pay = (n?: number) => (n ? Math.round(n / 8).toLocaleString() : "0");

    if (scene === "Promotion")
      return (
        <PromotionWindow
          name={c.name}
          fromLevel={prev?.rank ?? 1}
          toLevel={lvl?.rank ?? 2}
          fromTitle={prev?.title || "Trainee"}
          toTitle={lvl?.title || "Associate"}
          newPay={pay(lvl?.salary)}
          description={c.description || "Your hard work paid off."}
          unlockedRewards={(lvl?.perks ?? []).slice(0, 3).map((p) => ({ label: p, kind: "perk" as const }))}
          unlockedInteractions={(lvl?.objectives ?? []).slice(0, 3)}
        />
      );

    if (scene === "Branches")
      return (
        <BranchWindow
          active={branch?.id ?? "b"}
          onSelect={() => {}}
          branches={(c.branches.length ? c.branches : [{ id: "b", name: "Main Track", description: "", levels: [] } as never]).map(
            (b: (typeof c.branches)[number]) => ({
              key: b.id,
              name: b.name || "Untitled Branch",
              description: b.description || "Career path",
              futureLevels: (b.levels ?? []).slice(0, 5).map((l) => ({
                level: l.rank,
                title: l.title || `Level ${l.rank}`,
                pay: pay(l.salary),
              })),
              requirements: (b.levels?.[0]?.objectives ?? []).slice(0, 3).map((o) => ({ label: o, met: true })),
            }),
          )}
        />
      );

    if (scene === "Notification")
      return (
        <NotificationPopup
          kind="career"
          title={`${c.name} — Day Complete`}
          body={`You earned §${(lvl?.salary ?? 0).toLocaleString()} today as ${lvl?.title || "a new hire"}.`}
          action="View Career"
        />
      );

    return (
      <CareerCard
        cover={c.coverImage}
        name={c.name || "Untitled Career"}
        description={c.description || "No description yet."}

        level={lvl?.rank ?? 1}
        levelTitle={lvl?.title || "Trainee"}
        pay={pay(lvl?.salary)}
        hours={lvl ? `${lvl.workStart}–${lvl.workEnd}` : "9–5"}
        days={lvl?.workDays?.length ? `${lvl.workDays.length} days` : "M–F"}
        performance={0.62}
        requirements={(lvl?.objectives ?? []).slice(0, 3).map((o) => ({ label: o, met: true }))}
        rewards={(lvl?.perks ?? []).slice(0, 3).map((p) => ({ label: p, kind: "perk" as const }))}
      />
    );
  }

  if (kind === "trait") {
    const t = store.state.traits.find((r) => r.id === id);
    if (!t) return <GameEmpty text="No traits yet — create one to see it in game." />;
    const buff = t.buffs[0];
    const color = MOOD_COLOR[buff?.emotion ?? "fine"] ?? "violet";

    if (scene === "Moodlet")
      return (
        <BuffCard
          name={buff?.name || `${t.name} Moodlet`}
          description={buff?.description || "No moodlet description yet."}
          mood={buff?.emotion || "Fine"}
          moodColor={color}
          duration={buff ? `${buff.durationHours}h remaining` : "4h remaining"}
          strength={Math.max(1, Math.min(3, buff?.weight ?? 1))}
        />
      );

    if (scene === "Tooltip")
      return (
        <TooltipPreview
          title={t.name || "Untitled Trait"}
          body={t.description || "No description yet."}
          tag={`${t.category} trait`}
        />
      );

    if (scene === "Notification")
      return (
        <NotificationPopup
          kind="trait"
          title={`${t.name} gained`}
          body={t.description || "This Sim now has a new trait."}
          action="View Sim"
        />
      );

    return (
      <TraitCard
        name={t.name || "Untitled Trait"}
        description={t.description || "No description yet."}
        category={t.category}
        color={color}
        moodlets={t.buffs.slice(0, 3).map((b) => ({
          label: b.name || "Moodlet",
          mood: b.emotion,
          tone: MOOD_COLOR[b.emotion] ?? "blue",
        }))}
        effects={t.socialInteractions.slice(0, 4)}
        autonomy={t.voiceEffect ? `Voice: ${t.voiceEffect}` : "Standard autonomy weighting."}
      />
    );
  }

  if (kind === "aspiration") {
    const a = store.state.aspirations.find((r) => r.id === id);
    if (!a) return <GameEmpty text="No aspirations yet — create one to see it in game." />;
    const tiers = a.milestones.map((m, i) => ({
      tier: `Tier ${i + 1}`,
      title: m.name || `Milestone ${i + 1}`,
      objectives: m.objectives.map((o, j) => ({ label: o, done: i === 0 && j === 0 })),
      progress: i === 0 ? 0.35 : 0,
    }));

    if (scene === "Milestone")
      return (
        <NotificationPopup
          kind="reward"
          title={`${tiers[0]?.title ?? "Milestone"} complete!`}
          body={a.description || "You completed a milestone of this aspiration."}
          action="Next Milestone"
        />
      );

    if (scene === "Tooltip")
      return (
        <TooltipPreview
          title={a.name || "Untitled Aspiration"}
          body={a.description || "No description yet."}
          tag={a.category || "Aspiration"}
        />
      );

    return (
      <AspirationCard
        name={a.name || "Untitled Aspiration"}
        category={a.category || "Unassigned"}
        milestones={tiers.length ? tiers : [{ tier: "Tier 1", title: "No milestones yet", objectives: [] }]}
        rewardTrait={a.rewardTraitId ? "Reward Trait" : "None set"}
      />
    );
  }

  if (kind === "notification") {
    const n = store.state.notifications.find((r) => r.id === id);
    if (!n) return <GameEmpty text="No notifications yet — add one to see it in game." />;
    return (
      <NotificationPopup
        kind={(n.previewKind ?? "info") as NotificationKind}
        title={n.title || n.name}
        body={n.body || "No body text yet."}
        action={n.actions[0]?.label}
        compact={scene === "Compact"}
      />
    );
  }

  if (kind === "asset") {
    const asset = store.state.assets.find((r) => r.id === id);
    if (!asset) return <GameEmpty text="No assets yet — add one to see it in game." />;
    return (
      <div className="flex items-center gap-3">
        <IconFrame emoji="🖼️" color="pink" size={54} label={asset.name} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold">{asset.name}</div>
          <div className="text-[11px] opacity-70">
            {asset.kind} · {asset.folder}
          </div>
        </div>
      </div>
    );
  }

  const careers = store.state.careers.filter((c) => c.projectId === project?.id).length;
  const traits = store.state.traits.filter((t) => t.projectId === project?.id).length;
  const asps = store.state.aspirations.filter((a) => a.projectId === project?.id).length;
  return (
    <NotificationPopup
      kind="success"
      title={`${project?.name ?? "Mod"} installed`}
      body={`v${project?.version ?? "0.1.0"} added ${careers} career(s), ${traits} trait(s) and ${asps} aspiration(s) to your game.`}
      action="Open in Game"
    />
  );
}

function GameEmpty({ text }: { text: string }) {
  return <div className="px-2 py-6 text-center text-[12px] opacity-60">{text}</div>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}
