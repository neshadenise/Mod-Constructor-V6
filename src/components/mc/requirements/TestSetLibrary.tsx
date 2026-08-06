/**
 * Test Set library — the project-wide catalogue of reusable requirements.
 *
 * Any builder can open this panel: it lists every test set in the active
 * project with its usage count, validation state, generated tuning name and
 * version history.
 */

import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  FlaskConical,
  History,
  Plus,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";
import {
  Badge,
  Btn,
  EmptyHint,
  Field,
  Panel,
  TextArea,
  TextInput,
} from "@/components/mc/trait/primitives";
import { useTestSets } from "@/lib/requirements/store";
import { REQUIREMENT_TEMPLATES, testSetFromTemplate } from "@/lib/requirements/templates";
import {
  compileTestSetXml,
  computeTestSetKeys,
  duplicateSets,
  summarizeTestSet,
  validateTestSet,
} from "@/lib/requirements/compile";
import { describeNode, type RequirementGroup, type TestSet } from "@/lib/requirements/schema";
import { RequirementEditor } from "./RequirementEditor";

export interface TestSetUsage {
  /** uuid -> list of places referencing it. */
  [uuid: string]: string[];
}

export function TestSetLibrary({
  namespace = "MyMods",
  usage = {},
  onPick,
}: {
  namespace?: string;
  usage?: TestSetUsage;
  onPick?: (set: TestSet) => void;
}) {
  const lib = useTestSets();
  const { advanced } = useAdvanced();
  const [selected, setSelected] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [filter, setFilter] = useState("");

  const current = selected ? lib.get(selected) : undefined;
  const dupes = useMemo(() => duplicateSets(lib.sets), [lib.sets]);

  const rows = lib.sets.filter(
    (s) =>
      !filter.trim() ||
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      describeNode(s.root).toLowerCase().includes(filter.toLowerCase()),
  );

  const create = () => {
    const set = lib.create();
    setSelected(set.uuid);
    toast.success("Test set created");
  };

  const importJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const count = lib.importSets(await file.text());
      toast[count ? "success" : "error"](count ? `Imported ${count} test set(s)` : "Nothing importable in that file");
    };
    input.click();
  };

  const download = (uuids?: string[]) => {
    const blob = new Blob([lib.exportJson(uuids)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-sets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
      <Panel title="Test sets" subtitle={`${lib.sets.length} reusable requirement${lib.sets.length === 1 ? "" : "s"}`}>
        <div className="flex flex-wrap gap-1.5">
          <Btn icon={Plus} variant="primary" onClick={create}>
            New
          </Btn>
          <Btn icon={Upload} onClick={importJson}>
            Import
          </Btn>
          <Btn icon={Download} onClick={() => download()}>
            Export
          </Btn>
        </div>

        <TextInput
          value={filter}
          placeholder="Search requirements…"
          onChange={(e) => setFilter(e.target.value)}
          className="mt-2"
        />

        <div className="mt-2 space-y-1">
          {rows.length === 0 && <EmptyHint>No test sets yet — start from a template below.</EmptyHint>}
          {rows.map((s) => {
            const issues = validateTestSet(s, lib.sets);
            const errs = issues.filter((i) => i.level === "error").length;
            const uses = usage[s.uuid]?.length ?? 0;
            return (
              <button
                key={s.uuid}
                type="button"
                onClick={() => setSelected(s.uuid)}
                className={cn(
                  "w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                  selected === s.uuid ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{s.name}</span>
                  <Badge tone={errs ? "error" : uses ? "ok" : "muted"}>
                    {errs ? `${errs} err` : `${uses} use${uses === 1 ? "" : "s"}`}
                  </Badge>
                </div>
                <p className="truncate text-[10.5px] text-muted-foreground">{describeNode(s.root)}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Templates
          </p>
          <div className="flex flex-wrap gap-1">
            {REQUIREMENT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.description}
                onClick={() => {
                  const set = lib.create(testSetFromTemplate(t));
                  setSelected(set.uuid);
                  toast.success(`Added "${t.label}"`);
                }}
                className="rounded-full border border-border bg-background px-2 py-0.5 text-[10.5px] text-muted-foreground hover:bg-muted"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {dupes.length > 0 && (
          <p className="mt-3 rounded-md bg-amber-500/10 px-2 py-1.5 text-[10.5px] text-amber-500">
            {dupes.length} group(s) of test sets share identical logic — merge them to keep the package small.
          </p>
        )}
      </Panel>

      <div className="min-w-0 space-y-3">
        {!current && <EmptyHint>Select a test set to edit its requirements.</EmptyHint>}
        {current && (
          <TestSetDetail
            key={current.uuid}
            set={current}
            namespace={namespace}
            advanced={advanced}
            uses={usage[current.uuid] ?? []}
            allSets={lib.sets}
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory((v) => !v)}
            onChange={(fn, note) => lib.update(current.uuid, fn, note)}
            onDuplicate={() => {
              const copy = lib.duplicate(current.uuid);
              if (copy) setSelected(copy.uuid);
            }}
            onDelete={() => {
              lib.remove(current.uuid);
              setSelected(null);
              toast.success("Test set deleted");
            }}
            onShare={() => download([current.uuid])}
            onRestore={(v) => lib.restoreVersion(current.uuid, v)}
            {...(onPick ? { onPick: () => onPick(current) } : {})}
          />
        )}
      </div>
    </div>
  );
}

function TestSetDetail({
  set,
  namespace,
  advanced,
  uses,
  allSets,
  showHistory,
  onToggleHistory,
  onChange,
  onDuplicate,
  onDelete,
  onShare,
  onRestore,
  onPick,
}: {
  set: TestSet;
  namespace: string;
  advanced: boolean;
  uses: string[];
  allSets: TestSet[];
  showHistory: boolean;
  onToggleHistory: () => void;
  onChange: (fn: (s: TestSet) => TestSet, note?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare: () => void;
  onRestore: (version: number) => void;
  onPick?: () => void;
}) {
  const issues = validateTestSet(set, allSets);
  const keys = computeTestSetKeys(namespace, set);
  const summary = summarizeTestSet(set);
  const problems: Record<string, "error" | "warning"> = {};
  for (const i of issues) if (i.nodeId && i.level !== "suggestion") problems[i.nodeId] = i.level;

  return (
    <>
      <Panel
        title={set.name || "Untitled test set"}
        subtitle={`v${set.version} · ${summary.tests} test(s) · used in ${uses.length} place(s)`}
      >
        <div className="mb-2 flex flex-wrap gap-1.5">
          {onPick && (
            <Btn variant="primary" onClick={onPick}>
              Use here
            </Btn>
          )}
          <Btn icon={Copy} onClick={onDuplicate}>
            Duplicate
          </Btn>
          <Btn icon={Share2} onClick={onShare}>
            Share
          </Btn>
          <Btn icon={History} onClick={onToggleHistory}>
            History
          </Btn>
          <Btn icon={Trash2} variant="danger" onClick={onDelete}>
            Delete
          </Btn>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Test name">
            <TextInput value={set.name} onChange={(e) => onChange((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="UUID" hint="Stable — references never break when the name changes.">
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-[10.5px]">
              {set.uuid}
            </div>
          </Field>
        </div>
        <Field label="Description">
          <TextArea
            value={set.description}
            onChange={(e) => onChange((s) => ({ ...s, description: e.target.value }))}
            placeholder="When should other builders reuse this?"
          />
        </Field>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {summary.packs.map((p) => (
            <Badge key={p} tone="accent">
              {p}
            </Badge>
          ))}
          {summary.refs.length > 0 && <Badge tone="muted">{summary.refs.length} resource ref(s)</Badge>}
          <Badge tone={issues.some((i) => i.level === "error") ? "error" : "ok"}>
            {issues.filter((i) => i.level === "error").length} error(s)
          </Badge>
        </div>
      </Panel>

      <Panel title="Requirements" subtitle="Nest groups to build AND / OR / NOT logic.">
        <RequirementEditor
          root={set.root}
          problems={problems}
          onChange={(root: RequirementGroup) => onChange((s) => ({ ...s, root }), "Edited requirements")}
        />
      </Panel>

      {issues.length > 0 && (
        <Panel title="Validation" subtitle={`${issues.length} finding(s)`}>
          <ul className="space-y-1">
            {issues.map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-[11.5px]">
                <Badge tone={i.level === "error" ? "error" : i.level === "warning" ? "warn" : "muted"}>
                  {i.level}
                </Badge>
                <span className="min-w-0 flex-1">
                  {i.message}
                  {i.fix && <span className="text-muted-foreground"> — {i.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {uses.length > 0 && (
        <Panel title="Used by" subtitle="Everything that references this test set.">
          <ul className="space-y-1 text-[11.5px]">
            {uses.map((u) => (
              <li key={u} className="rounded-md border border-border px-2 py-1">
                {u}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {showHistory && (
        <Panel title="Version history" subtitle="Restore any earlier revision.">
          {set.history.length === 0 && <EmptyHint>No earlier versions yet.</EmptyHint>}
          <ul className="space-y-1">
            {set.history.map((h) => (
              <li key={h.version} className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
                <Badge tone="muted">v{h.version}</Badge>
                <span className="min-w-0 flex-1 truncate text-[11.5px]">{h.note}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(h.at).toLocaleString()}
                </span>
                <Btn onClick={() => onRestore(h.version)}>Restore</Btn>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {advanced && (
        <Panel title="Generated tuning" subtitle="Read-only — the builder owns these values.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tuning name">
              <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-[10.5px]">
                {keys.tuningName}
              </div>
            </Field>
            <Field label="Instance (hex / decimal)">
              <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-[10.5px]">
                0x{keys.instanceHex} · {keys.instanceDecimal}
              </div>
            </Field>
          </div>
          <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-2 font-mono text-[10.5px] leading-relaxed">
            {compileTestSetXml(set, namespace, keys)}
          </pre>
          <Btn
            icon={Copy}
            onClick={() => {
              void navigator.clipboard.writeText(compileTestSetXml(set, namespace, keys));
              toast.success("XML copied");
            }}
          >
            Copy XML
          </Btn>
        </Panel>
      )}
    </>
  );
}
