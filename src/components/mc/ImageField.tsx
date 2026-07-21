/**
 * ImageField — reusable icon/image input with a "Generate with ChatGPT" menu.
 *
 * The available actions depend on AppHostCapabilities:
 *   - In ChatGPT mode with provider=chatgpt → all ChatGPT actions are enabled.
 *   - In Desktop mode → shows Browse + a hint pointing to Settings → Image
 *     Generation Provider. No ChatGPT actions are exposed because a standalone
 *     desktop install cannot consume the user's ChatGPT subscription.
 */
import { useState } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Copy,
  Scissors,
  Download,
  FolderPlus,
  ChevronDown,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppHost } from "@/lib/app-host";
import { saveGeneratedImage, latestGeneratedImage } from "@/lib/project-store";

export interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  /** Slot semantics — used in prompt hints sent to ChatGPT. */
  slot?: "icon" | "image";
  /** Optional context that gives ChatGPT a better generation prompt. */
  context?: { subject?: string; style?: string };
}

export function ImageField({ label, value, onChange, hint, slot = "image", context }: ImageFieldProps) {
  const host = useAppHost();
  const [open, setOpen] = useState(false);
  const chatgptActionsEnabled = host.isChatGPT && host.imageProvider === "chatgpt";

  const runChatGPT = (action: string) => {
    // In a real ChatGPT App this would call window.openai.callTool(...)
    // Here we simulate the round-trip so the UX is testable in the preview.
    setOpen(false);
    const subject = context?.subject || label.toLowerCase();
    toast.message(`${action} · ${subject}`, {
      description: "ChatGPT is generating natively. No API key used.",
    });
    setTimeout(() => {
      const name = `${slot}_chatgpt_${Date.now()}.png`;
      // Store a placeholder dataUrl so downstream export works.
      saveGeneratedImage(name, "data:image/png;base64,placeholder");
      onChange(name);
      toast.success(`${label} updated · saved to Assets/Generated`);
    }, 900);
  };

  const importLatest = () => {
    setOpen(false);
    const asset = latestGeneratedImage();
    if (!asset) {
      toast.error("No ChatGPT-generated image yet");
      return;
    }
    onChange(asset.name);
    toast.success(`Imported latest → ${asset.name}`);
  };

  const browse = () => {
    setOpen(false);
    onChange(`${slot}_${Date.now()}.png`);
    toast.success(`${label} picked from disk`);
  };

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 text-[11px] text-muted-foreground">
          {value || "No file selected"}
          {hint && <div className="text-[10px]">{hint}</div>}
        </div>
        <div className="relative">
          <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-card">
            <button
              onClick={browse}
              className="px-2 py-1 text-[11px] font-medium hover:bg-accent"
            >
              Browse…
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="border-l border-border px-1.5 hover:bg-accent"
              aria-label="More image actions"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg">
                {chatgptActionsEnabled ? (
                  <>
                    <MenuHeader>ChatGPT Image Generation</MenuHeader>
                    <MenuItem icon={Sparkles} onClick={() => runChatGPT("Generate with ChatGPT")}>
                      Generate with ChatGPT
                    </MenuItem>
                    <MenuItem icon={Wand2} onClick={() => runChatGPT("Edit with ChatGPT")} disabled={!value}>
                      Edit with ChatGPT
                    </MenuItem>
                    <MenuItem icon={Copy} onClick={() => runChatGPT("Create variations")} disabled={!value}>
                      Create variations
                    </MenuItem>
                    <MenuItem icon={Scissors} onClick={() => runChatGPT("Remove background")} disabled={!value}>
                      Remove background
                    </MenuItem>
                    <div className="my-1 border-t border-border" />
                    <MenuItem icon={Download} onClick={importLatest}>
                      Import latest generated image
                    </MenuItem>
                    <MenuItem
                      icon={FolderPlus}
                      onClick={() => {
                        if (!value) {
                          toast.error("Nothing to save yet");
                          return;
                        }
                        saveGeneratedImage(value, "data:image/png;base64,placeholder");
                        setOpen(false);
                        toast.success("Saved to Assets/Generated");
                      }}
                    >
                      Save to project Assets
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuHeader>Image source</MenuHeader>
                    <MenuItem icon={Upload} onClick={browse}>
                      Browse local file…
                    </MenuItem>
                    <div className="my-1 border-t border-border" />
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      {host.isDesktop ? (
                        <>
                          Desktop mode. To enable generation, configure a
                          provider in <span className="font-semibold">Settings → Image Generation</span>.
                          ChatGPT actions are only available when this project
                          is open in the ChatGPT App.
                        </>
                      ) : (
                        <>Select "ChatGPT Image Generation" in Settings to unlock generation actions.</>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]",
        disabled ? "cursor-not-allowed text-muted-foreground/50" : "hover:bg-accent",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
