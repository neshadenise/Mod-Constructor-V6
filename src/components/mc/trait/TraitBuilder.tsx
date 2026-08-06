/**
 * Trait Builder.
 *
 * A single trait document is edited here and persisted to the active project
 * through the shared builder-record binding. Every field writes structured
 * data — nothing in this screen is decorative.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Blocks,
  FileDown,
  Languages,
  Link2,
  Redo2,
  Save,
  Settings2,
  ShieldAlert,
  Sparkles,
  Undo2,
  UserCheck,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { useBuilderRecord } from "@/lib/builder-record";
import { useBuilderSeed } from "@/lib/builder-seed";
import { useAdvancedMode } from "@/lib/advanced-mode";
import { migrateTraitDoc } from "@/lib/traits/migrate";
import { blankTraitDoc, sanitizeInternalName, type TraitDoc, type TraitSectionId } from "@/lib/traits/schema";
import { validateTrait } from "@/lib/traits/validate";
import { exportTrait } from "@/lib/traits/export";
import type { Trait } from "@/lib/types";
import { Badge, Btn } from "./primitives";
import { TraitLanding } from "./TraitLanding";
import {
  AcquisitionSection,
  AdvancedSection,
  ConflictsSection,
  EffectsSection,
  EligibilitySection,
  IdentitySection,
  PreviewSection,
  ReactionsSection,
  StringsSection,
  ValidationSection,
  useResolveContext,
  type SectionProps,
} from "./sections";

const NAV: { id: TraitSectionId; label: string; icon: typeof Blocks; advanced?: boolean }[] = [
  { id: "identity", label: "Identity", icon: Sparkles },
  { id: "eligibility", label: "Eligibility", icon: UserCheck },
  { id: "effects", label: "Effects", icon: Blocks },
  { id: "acquisition", label: "Acquisition", icon: Wand2 },
  { id: "conflicts", label: "Conflicts & rules", icon: ShieldAlert },
  { id: "reactions", label: "Reactions", icon: Users },
  { id: "strings", label: "Text", icon: Languages },
  { id: "preview", label: "Preview", icon: Link2 },
  { id: "validation", label: "Validation", icon: ShieldAlert },
  { id: "advanced", label: "Advanced", icon: Settings2, advanced: true },
];

export function TraitBuilder() {
  const store = useStore();
  const project = useActiveProject();
  const ctx = useResolveContext();
  const { advanced } = useAdvancedMode();

  const [doc, setDoc] = useState<TraitDoc>(() => blankTraitDoc());
  const [section, setSection] = useState<TraitSectionId>("identity");
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [focus, setFocus] = useState<string | undefined>();

  const past = useRef<TraitDoc[]>([]);
  const future = useRef<TraitDoc[]>([]);
  const [, bump] = useState(0);

  const patch = useCallback((fn: (d: TraitDoc) => TraitDoc) => {
    setDoc((cur) => {
      past.current = [...past.current.slice(-40), cur];
      future.current = [];
      return fn(cur);
    });
    bump((n) => n + 1);
  }, []);

  const record = useBuilderRecord<TraitDoc>({
    kind: "trait",
    snapshot: () => doc,
    restore: (d) => {
      past.current = [];
      future.current = [];
      setDoc(d && typeof d === "object" && "ids" in d ? d : blankTraitDoc());
    },
    blank: () => blankTraitDoc(),
    title: (d) => d.displayName,
    fromRecord: (rec) => migrateTraitDoc(rec as Trait),
  });

  useBuilderSeed<Partial<TraitDoc>>("trait", (payload) => {
    record.loadDraft(blankTraitDoc(payload));
    setMode("edit");
    setSection("identity");
  });

  const validation = useMemo(
    () => validateTrait(doc, ctx, record.currentId ?? undefined),
    [doc, ctx, record.currentId],
  );

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(doc);
    setDoc(prev);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(doc);
    setDoc(next);
  };

  const openTrait = (id: string) => {
    record.select(id);
    setMode("edit");
    setSection("identity");
  };

  const createTrait = () => {
    record.addNew();
    setDoc(blankTraitDoc());
    setMode("edit");
    setSection("identity");
  };

  const duplicate = (id: string) => {
    const src = store.state.traits.find((t) => t.id === id);
    if (!src) return;
    const copy = migrateTraitDoc(src);
    const name = `${copy.displayName} Copy`;
    record.loadDraft(
      blankTraitDoc({
        ...copy,
        displayName: name,
        strings: { ...copy.strings, displayName: { ...copy.strings.displayName, text: name } },
      }),
    );
    setMode("edit");
    toast.success("Duplicated with fresh identifiers");
  };

  const exportOne = (id?: string) => {
    const target = id ? migrateTraitDoc(store.state.traits.find((t) => t.id === id)!) : doc;
    const result = exportTrait(target, ctx, { recordId: id ?? record.currentId ?? undefined });
    if (!result.ok) {
      toast.error(`Export blocked: ${result.blockers[0] ?? "validation errors"}`);
      setSection("validation");
      setMode("edit");
      return;
    }
    const blob = new Blob(
      [result.files.map((f) => `===== ${f.name} =====\n${f.contents}`).join("\n\n")],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.ids.internalName || sanitizeInternalName(target.displayName)}.trait.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast[result.loadable ? "success" : "warning"](
      result.loadable ? "Trait exported" : "Exported — SimData still required before the game will load it",
    );
  };

  if (!project) return null;

  if (mode === "list") {
    return (
      <TraitLanding
        ctx={ctx}
        onOpen={openTrait}
        onCreate={createTrait}
        onDuplicate={duplicate}
        onDelete={(id) => {
          record.remove(id);
          toast.success("Trait deleted");
        }}
        onExport={(id) => exportOne(id)}
      />
    );
  }

  const sectionProps: SectionProps = { doc, patch, ctx, validation, ...(focus ? { focus } : {}) };
  const visibleNav = NAV.filter((n) => !n.advanced || advanced);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2">
        <Btn icon={ArrowLeft} onClick={() => setMode("list")}>All traits</Btn>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{doc.displayName || "Untitled trait"}</span>
            <Badge tone={validation.errors ? "error" : validation.warnings ? "warn" : "ok"}>
              {validation.errors ? `${validation.errors} errors` : validation.warnings ? `${validation.warnings} warnings` : "valid"}
            </Badge>
            {record.dirty && <Badge tone="muted">unsaved</Badge>}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {doc.ids.namespace}:{doc.ids.internalName}
          </div>
        </div>
        <Btn icon={Undo2} onClick={undo} title="Undo">{""}</Btn>
        <Btn icon={Redo2} onClick={redo} title="Redo">{""}</Btn>
        <Btn icon={Save} onClick={() => { record.save(); toast.success("Trait saved to project"); }}>Save</Btn>
        <Btn icon={FileDown} variant="primary" onClick={() => exportOne()}>Export</Btn>
      </header>

      <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
        <nav className="space-y-0.5">
          {visibleNav.map((n) => {
            const issues = validation.issues.filter((i) => i.section === n.id);
            const bad = issues.some((i) => i.level === "error");
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => { setSection(n.id); setFocus(undefined); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
                  section === n.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <n.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{n.label}</span>
                {issues.length > 0 && (
                  <span className={cn("h-1.5 w-1.5 rounded-full", bad ? "bg-red-500" : "bg-amber-500")} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {section === "identity" && <IdentitySection {...sectionProps} />}
          {section === "eligibility" && <EligibilitySection {...sectionProps} />}
          {section === "effects" && <EffectsSection {...sectionProps} />}
          {section === "acquisition" && <AcquisitionSection {...sectionProps} />}
          {section === "conflicts" && <ConflictsSection {...sectionProps} />}
          {section === "reactions" && <ReactionsSection {...sectionProps} />}
          {section === "strings" && <StringsSection {...sectionProps} />}
          {section === "preview" && <PreviewSection {...sectionProps} />}
          {section === "validation" && (
            <ValidationSection
              {...sectionProps}
              onJump={(issue) => {
                setSection(issue.section);
                setFocus(issue.target);
              }}
            />
          )}
          {section === "advanced" && advanced && <AdvancedSection {...sectionProps} />}
        </div>
      </div>
    </div>
  );
}
