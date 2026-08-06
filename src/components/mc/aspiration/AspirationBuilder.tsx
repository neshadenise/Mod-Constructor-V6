/**
 * Aspiration Builder.
 *
 * A single aspiration document is edited here and persisted to the active
 * project through the shared builder-record binding. Every field writes
 * structured data — nothing in this screen is decorative.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileDown,
  Languages,
  Link2,
  ListChecks,
  Redo2,
  Save,
  Settings2,
  ShieldAlert,
  Sparkles,
  Undo2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { useBuilderRecord, requestRevealRecord } from "@/lib/builder-record";
import { useBuilderSeed } from "@/lib/builder-seed";
import { useAdvanced } from "@/lib/advanced-mode";
import { useNavigation } from "@/lib/navigation";
import { migrateAspirationDoc } from "@/lib/aspirations/migrate";
import {
  blankAspirationDoc,
  sanitizeInternalName,
  type AspirationDoc,
} from "@/lib/aspirations/schema";
import { validateAspiration } from "@/lib/aspirations/validate";
import { exportAspiration } from "@/lib/aspirations/export";
import { docFromTemplate, type AspirationTemplate } from "@/lib/aspirations/templates";
import type { Aspiration } from "@/lib/types";
import { Badge, Btn } from "@/components/mc/trait/primitives";
import { AspirationLanding } from "./AspirationLanding";
import {
  AdvancedSection,
  AvailabilitySection,
  DependenciesSection,
  IdentitySection,
  MilestonesSection,
  ResourcesSection,
  StringsSection,
  ValidationSection,
  useResolveContext,
  type AspirationSectionId,
  type SectionProps,
} from "./sections";

const NAV: { id: AspirationSectionId | "milestones"; label: string; icon: typeof Sparkles; advanced?: boolean }[] = [
  { id: "identity", label: "Basic info", icon: Sparkles },
  { id: "availability", label: "Availability", icon: UserCheck },
  { id: "milestones", label: "Milestones", icon: ListChecks },
  { id: "resources", label: "Resources & IDs", icon: Link2 },
  { id: "strings", label: "Text", icon: Languages },
  { id: "dependencies", label: "Dependencies", icon: Link2 },
  { id: "validation", label: "Validation", icon: ShieldAlert },
  { id: "advanced", label: "Advanced", icon: Settings2, advanced: true },
];

type SectionId = (typeof NAV)[number]["id"];

export function AspirationBuilder() {
  const store = useStore();
  const project = useActiveProject();
  const ctx = useResolveContext();
  const { advanced } = useAdvanced();
  const nav = useNavigation();

  const [doc, setDoc] = useState<AspirationDoc>(() => blankAspirationDoc());
  const [section, setSection] = useState<SectionId>("identity");
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [focus, setFocus] = useState<string | undefined>();

  const past = useRef<AspirationDoc[]>([]);
  const future = useRef<AspirationDoc[]>([]);
  const [, bump] = useState(0);

  const patch = useCallback((fn: (d: AspirationDoc) => AspirationDoc) => {
    setDoc((cur) => {
      past.current = [...past.current.slice(-40), cur];
      future.current = [];
      return { ...fn(cur), updatedAt: Date.now() };
    });
    bump((n) => n + 1);
  }, []);

  const record = useBuilderRecord<AspirationDoc>({
    kind: "aspiration",
    snapshot: () => doc,
    restore: (d) => {
      past.current = [];
      future.current = [];
      setDoc(d && typeof d === "object" && "ids" in d ? d : blankAspirationDoc());
    },
    blank: () => blankAspirationDoc(),
    title: (d) => d.displayName,
    fromRecord: (rec) => migrateAspirationDoc(rec as Aspiration),
  });

  useBuilderSeed<Partial<AspirationDoc>>("aspiration", (payload) => {
    record.loadDraft(blankAspirationDoc(payload));
    setMode("edit");
    setSection("identity");
  });

  const validation = useMemo(
    () => validateAspiration(doc, ctx, record.currentId ?? undefined),
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

  const openAspiration = (id: string) => {
    record.select(id);
    setMode("edit");
    setSection("identity");
  };

  const createAspiration = () => {
    record.addNew();
    setDoc(blankAspirationDoc());
    setMode("edit");
    setSection("identity");
  };

  const createFromTemplate = (t: AspirationTemplate) => {
    record.loadDraft(docFromTemplate(t, doc.ids.namespace));
    setMode("edit");
    setSection("identity");
    toast.success(`Started from the ${t.label} template`);
  };

  const duplicate = (id: string) => {
    const src = store.state.aspirations.find((a) => a.id === id);
    if (!src) return;
    const copy = migrateAspirationDoc(src);
    const name = `${copy.displayName} Copy`;
    record.loadDraft(
      blankAspirationDoc({
        ...copy,
        displayName: name,
        strings: { ...copy.strings, displayName: { ...copy.strings.displayName, text: name } },
      }),
    );
    setMode("edit");
    toast.success("Duplicated with fresh identifiers");
  };

  const rename = (id: string, name: string) => {
    const src = store.state.aspirations.find((a) => a.id === id);
    if (!src) return;
    const next = migrateAspirationDoc(src);
    next.displayName = name;
    next.strings = { ...next.strings, displayName: { ...next.strings.displayName, text: name } };
    store.updateAspiration(id, { name, builderState: next as unknown as Record<string, unknown> });
    if (record.currentId === id) setDoc(next);
    toast.success("Renamed — internal ids and string keys are unchanged");
  };

  const exportOne = (id?: string) => {
    const src = id ? store.state.aspirations.find((a) => a.id === id) : null;
    const target = src ? migrateAspirationDoc(src) : doc;
    const result = exportAspiration(target, ctx, { recordId: id ?? record.currentId ?? undefined });
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
    a.download = `${target.ids.internalName || sanitizeInternalName(target.displayName)}.aspiration.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast[result.loadable ? "success" : "warning"](
      result.loadable
        ? "Aspiration exported"
        : "Exported — SimData still required before the game will load it",
    );
  };

  const batchValidate = () => {
    const rows = store.state.aspirations.filter((a) => a.projectId === project?.id);
    let errors = 0;
    let warnings = 0;
    for (const a of rows) {
      const v = validateAspiration(migrateAspirationDoc(a), ctx, a.id);
      errors += v.errors;
      warnings += v.warnings;
    }
    if (!rows.length) return toast.info("No aspirations to validate");
    toast[errors ? "error" : warnings ? "warning" : "success"](
      `${rows.length} aspirations · ${errors} errors · ${warnings} warnings`,
    );
  };

  if (!project) return null;

  if (mode === "list") {
    return (
      <AspirationLanding
        ctx={ctx}
        onOpen={openAspiration}
        onCreate={createAspiration}
        onCreateFromTemplate={createFromTemplate}
        onImport={() => nav.go("package-importer")}
        onDuplicate={duplicate}
        onRename={rename}
        onDelete={(id) => {
          record.remove(id);
          toast.success("Aspiration deleted");
        }}
        onExport={(id) => exportOne(id)}
        onBatchValidate={batchValidate}
      />
    );
  }

  const sectionProps: SectionProps = { doc, patch, ctx, validation, ...(focus ? { focus } : {}) };
  const visibleNav = NAV.filter((n) => !n.advanced || advanced);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2">
        <Btn icon={ArrowLeft} onClick={() => setMode("list")}>All aspirations</Btn>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">
              {doc.displayName || "Untitled aspiration"}
            </span>
            <Badge tone={validation.errors ? "error" : validation.warnings ? "warn" : "ok"}>
              {validation.errors
                ? `${validation.errors} errors`
                : validation.warnings
                  ? `${validation.warnings} warnings`
                  : "valid"}
            </Badge>
            {record.dirty && <Badge tone="muted">unsaved</Badge>}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {doc.ids.namespace}:{doc.ids.internalName}
          </div>
        </div>
        <Btn icon={Undo2} onClick={undo} title="Undo">{""}</Btn>
        <Btn icon={Redo2} onClick={redo} title="Redo">{""}</Btn>
        <Btn icon={Save} onClick={() => { record.save(); toast.success("Aspiration saved to project"); }}>Save</Btn>
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
          {section === "availability" && <AvailabilitySection {...sectionProps} />}
          {section === "milestones" && <MilestonesSection {...sectionProps} />}
          {section === "resources" && <ResourcesSection {...sectionProps} />}
          {section === "strings" && <StringsSection {...sectionProps} />}
          {section === "dependencies" && (
            <DependenciesSection
              {...sectionProps}
              onOpen={(kind, id) => {
                if (kind === "trait" || kind === "career" || kind === "aspiration") {
                  nav.go(kind);
                  requestRevealRecord(kind, id);
                }
              }}
            />
          )}
          {section === "validation" && (
            <ValidationSection
              {...sectionProps}
              onJump={(issue) => {
                setSection(issue.section as SectionId);
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
