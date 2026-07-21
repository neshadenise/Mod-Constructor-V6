import { useState } from "react";
import { PreviewToolbar, PreviewSurface, usePreviewToolbar } from "./PreviewShell";
import {
  TraitCard,
  BuffCard,
  TooltipPreview,
  NotificationPopup,
  IconFrame,
  SimPortrait,
} from "./GameUI";

export type TraitPreviewData = {
  name: string;
  description: string;
  category: string;
  emoji?: string;
  color?: string;
  buffs: { name: string; mood: string; duration: string; color?: string; icon?: string; description?: string }[];
  effects: string[];
  autonomy?: string;
};

const TRAIT_TABS = [
  "CAS Card",
  "Tooltip",
  "Trait Added Notification",
  "Buff Preview",
  "Buff Tooltip",
] as const;

export function TraitPreview({ data }: { data: TraitPreviewData }) {
  const toolbar = usePreviewToolbar({
    previewType: TRAIT_TABS[0],
    types: [...TRAIT_TABS],
  });
  const [selectedBuff, setSelectedBuff] = useState(0);

  const name = data.name || "Untitled Trait";
  const description = data.description || "No Description";
  const category = data.category || "Unassigned";
  const emoji = data.emoji || "✨";
  const color = data.color || "violet";
  const autonomy = data.autonomy || "Sims with this trait occasionally act on it autonomously.";
  const buff = data.buffs[selectedBuff] ?? {
    name: "No buffs yet",
    mood: "Fine",
    duration: "—",
    color: "blue",
    icon: "😌",
    description: "Add a buff in the editor to preview it here.",
  };

  return (
    <div>
      <PreviewToolbar state={toolbar} accent="violet" title="Trait Live Preview" />
      <PreviewSurface state={toolbar}>
        {toolbar.previewType === "CAS Card" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-[var(--violet)]/15 to-transparent px-3 py-2">
              <SimPortrait name="Ada Nova" age="Young Adult" size={44} />
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: `var(--${color})` }}
              >
                Trait Selected
              </span>
            </div>
            <TraitCard
              name={name}
              description={description}
              category={category}
              emoji={emoji}
              color={color}
              moodlets={data.buffs.slice(0, 3).map((b) => ({
                label: b.name || "Unknown Buff",
                mood: b.mood || "Fine",
                tone: b.color,
              }))}
              effects={
                data.effects.length ? data.effects : ["Sims with this trait behave differently in specific situations."]
              }
              autonomy={autonomy}
            />
          </div>
        )}

        {toolbar.previewType === "Tooltip" && (
          <div className="flex items-center justify-center py-6">
            <TooltipPreview title={name} body={description} tag={category} color={color} />
          </div>
        )}

        {toolbar.previewType === "Trait Added Notification" && (
          <NotificationPopup
            kind="trait"
            title={`Trait added: ${name}`}
            body={description}
            action="Learn more"
          />
        )}

        {toolbar.previewType === "Buff Preview" && (
          <div className="space-y-2">
            {data.buffs.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {data.buffs.map((b, i) => (
                  <button
                    key={b.name + i}
                    onClick={() => setSelectedBuff(i)}
                    className={
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors " +
                      (i === selectedBuff
                        ? "bg-[var(--violet)] text-white"
                        : "bg-black/[0.05] hover:bg-black/[0.1] [[data-preview-theme='dark']_&]:bg-white/10")
                    }
                  >
                    {b.name || "Unnamed"}
                  </button>
                ))}
              </div>
            )}
            <BuffCard
              name={buff.name || "Unknown Buff"}
              mood={buff.mood || "Fine"}
              moodColor={buff.color || "blue"}
              duration={buff.duration || "—"}
              icon={buff.icon || "😌"}
              stack={2}
              strength={2}
              description={buff.description || `Triggered by the ${name} trait.`}
            />
            <div className="rounded-lg bg-black/[0.04] p-2 text-[11px] opacity-85 [[data-preview-theme='dark']_&]:bg-white/8">
              <span className="font-bold">Stacks:</span> up to 3 · <span className="font-bold">Category:</span>{" "}
              {category}
            </div>
          </div>
        )}

        {toolbar.previewType === "Buff Tooltip" && (
          <div className="flex items-center justify-center py-6">
            <TooltipPreview
              title={buff.name || "Unknown Buff"}
              body={buff.description || `${buff.mood || "Fine"} for ${buff.duration || "a while"}.`}
              tag={buff.mood || "Buff"}
              color={buff.color || "blue"}
            />
          </div>
        )}
      </PreviewSurface>
    </div>
  );
}
