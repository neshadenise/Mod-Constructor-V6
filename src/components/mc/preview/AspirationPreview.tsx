import { PreviewToolbar, PreviewSurface, usePreviewToolbar } from "./PreviewShell";
import { AspirationCard, NotificationPopup, TooltipPreview } from "./GameUI";

export type AspirationPreviewData = {
  name: string;
  category: string;
  emoji?: string;
  color?: string;
  rewardTrait: string;
  description: string;
  tiers: {
    tier: string;
    title: string;
    objectives: { label: string; done?: boolean }[];
    progress?: number;
  }[];
};

const ASP_TABS = ["Aspiration Panel", "Milestone Complete", "Completion Notification", "Tooltip"] as const;

export function AspirationPreview({ data }: { data: AspirationPreviewData }) {
  const toolbar = usePreviewToolbar({
    previewType: ASP_TABS[0],
    types: [...ASP_TABS],
  });

  const name = data.name || "Untitled Aspiration";
  const category = data.category || "Unassigned";
  const emoji = data.emoji || "🎯";
  const color = data.color || "teal";
  const rewardTrait = data.rewardTrait || "Unknown Reward";

  return (
    <div>
      <PreviewToolbar state={toolbar} accent="teal" title="Aspiration Live Preview" />
      <PreviewSurface state={toolbar}>
        {toolbar.previewType === "Aspiration Panel" && (
          <AspirationCard
            name={name}
            category={category}
            emoji={emoji}
            color={color}
            rewardTrait={rewardTrait}
            milestones={data.tiers.map((t) => ({
              tier: t.tier,
              title: t.title || "Unnamed Milestone",
              objectives: t.objectives.length
                ? t.objectives
                : [{ label: "Add objectives in the editor", done: false }],
              progress: t.progress,
            }))}
          />
        )}
        {toolbar.previewType === "Milestone Complete" && (
          <NotificationPopup
            kind="reward"
            title={`Milestone complete: ${data.tiers[0]?.title || "First Milestone"}`}
            body={`One step closer to ${name}.`}
            action="View Aspiration"
          />
        )}
        {toolbar.previewType === "Completion Notification" && (
          <NotificationPopup
            kind="promotion"
            title={`Aspiration completed: ${name}`}
            body={`Your Sim earned the ${rewardTrait} reward trait.`}
            action="Claim Reward"
          />
        )}
        {toolbar.previewType === "Tooltip" && (
          <div className="flex items-center justify-center py-6">
            <TooltipPreview title={name} body={data.description || "No Description"} tag={category} color={color} />
          </div>
        )}
      </PreviewSurface>
    </div>
  );
}
