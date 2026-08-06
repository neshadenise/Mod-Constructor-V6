/**
 * Part 4 workspaces: Requirements (test sets) and Build (export pipeline,
 * build report, dependency graph, package manifest, advanced viewers).
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Copy,
  Download,
  FileJson,
  FileText,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";
import { Badge, Btn, EmptyHint, Panel } from "@/components/mc/trait/primitives";
import { TestSetLibrary } from "@/components/mc/requirements/TestSetLibrary";
import { useTestSets } from "@/lib/requirements/store";
import {
  PIPELINE_STEPS,
  formatBytes,
  reportToHtml,
  reportToJson,
  reportToMarkdown,
  runExportPipeline,
  type BuildReport,
  type StepStatus,
} from "@/lib/aspirations/pipeline";
import { computeAspirationKeys } from "@/lib/aspirations/ids";
import { buildAspirationXml, buildStblEntries } from "@/lib/aspirations/export";
import type { SectionProps } from "./sections";

/* ---------------------------------------------------------- requirements -- */

export function RequirementsSection({ doc }: SectionProps) {
  const usage = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of doc.milestones) {
      for (const o of m.objectives) {
        const uuid = (o.params?.["testSet"] as string | undefined) ?? "";
        if (uuid) map[uuid] = [...(map[uuid] ?? []), `Objective — ${o.label || "untitled"}`];
      }
    }
    return map;
  }, [doc.milestones]);

  return (
    <div className="space-y-3">
      <Panel
        title="Requirements & test sets"
        subtitle="Reusable conditions shared by every builder in this project. Reference them instead of repeating logic."
      >
        <p className="text-[11.5px] text-muted-foreground">
          A test set answers one question — “is this allowed right now?” — and can gate starting,
          progressing, completing, rewards, notifications and loot.
        </p>
      </Panel>
      <TestSetLibrary namespace={doc.ids.namespace} usage={usage} />
    </div>
  );
}

/* ------------------------------------------------------------------ build -- */

const STATUS_ICON: Record<StepStatus, typeof CheckCircle2> = {
  pending: CircleDashed,
  running: Loader2,
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  skipped: CircleDashed,
};

const STATUS_TONE: Record<StepStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-primary",
  ok: "text-emerald-500",
  warn: "text-amber-500",
  fail: "text-red-500",
  skipped: "text-muted-foreground",
};

export function BuildSection({ doc, ctx }: SectionProps) {
  const { advanced } = useAdvanced();
  const lib = useTestSets();
  const [report, setReport] = useState<BuildReport | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"report" | "graph" | "manifest" | "xml" | "stbl">("report");

  const run = () => {
    setRunning(true);
    // Let the "running" state paint before the synchronous pipeline blocks.
    setTimeout(() => {
      const result = runExportPipeline(doc, ctx, { testSets: lib.sets });
      setReport(result);
      setRunning(false);
      toast[result.ok ? (result.loadable ? "success" : "warning") : "error"](
        result.ok
          ? result.loadable
            ? `Build succeeded — ${result.resources} resources`
            : "Built with warnings — package not loadable yet"
          : `Build failed — ${result.errors.length} error(s)`,
      );
    }, 30);
  };

  const download = (name: string, contents: string, type: string) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const keys = computeAspirationKeys(doc);
  const slug = doc.ids.internalName || "aspiration";

  return (
    <div className="space-y-3">
      <Panel
        title="Export pipeline"
        subtitle="Twelve stages: validate → resolve → XML → SimData → STBL → icons → resources → package → verify → report → health → mark."
        actions={
          <Btn icon={running ? Loader2 : Play} variant="primary" onClick={run} disabled={running}>
            {running ? "Building…" : "Run build"}
          </Btn>
        }
      >
        <ol className="space-y-1">
          {PIPELINE_STEPS.map((spec, i) => {
            const step = report?.steps.find((s) => s.id === spec.id);
            const status: StepStatus = running ? "running" : (step?.status ?? "pending");
            const Icon = STATUS_ICON[status];
            return (
              <li
                key={spec.id}
                className="flex items-center gap-2 rounded-md border border-border/70 bg-background/50 px-2 py-1.5"
              >
                <span className="w-5 shrink-0 text-[10px] font-mono text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className={cn("h-3.5 w-3.5 shrink-0", STATUS_TONE[status], status === "running" && "animate-spin")} />
                <span className="w-40 shrink-0 text-[11.5px] font-semibold">{spec.label}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {step?.detail ?? "Waiting for a build."}
                </span>
                {step && <span className="text-[10px] text-muted-foreground">{step.ms} ms</span>}
              </li>
            );
          })}
        </ol>
      </Panel>

      {!report && <EmptyHint>Run a build to produce the package, manifest and build report.</EmptyHint>}

      {report && (
        <>
          <Panel
            title="Build report"
            subtitle={`${new Date(report.generatedAt).toLocaleString()} · ${report.durationMs} ms`}
            actions={
              <>
                <Btn
                  icon={Copy}
                  onClick={() => {
                    void navigator.clipboard.writeText(reportToMarkdown(report));
                    toast.success("Report copied");
                  }}
                >
                  Copy
                </Btn>
                <Btn icon={FileText} onClick={() => download(`${slug}-build-report.html`, reportToHtml(report), "text/html")}>
                  HTML
                </Btn>
                <Btn icon={FileJson} onClick={() => download(`${slug}-build-report.json`, reportToJson(report), "application/json")}>
                  JSON
                </Btn>
                <Btn
                  icon={Download}
                  variant="primary"
                  onClick={() =>
                    download(
                      `${slug}.package-preview.txt`,
                      report.files.map((f) => `===== ${f.name} =====\n${f.contents}`).join("\n\n"),
                      "text/plain",
                    )
                  }
                >
                  Package
                </Btn>
              </>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Resources" value={String(report.resources)} />
              <Stat label="Package size" value={formatBytes(report.packageBytes)} />
              <Stat
                label="Validation"
                value={`${report.errors.length} err · ${report.warnings.length} warn`}
                tone={report.errors.length ? "error" : report.warnings.length ? "warn" : "ok"}
              />
              <Stat
                label="Project health"
                value={`${report.healthScore}%`}
                tone={report.healthScore >= 90 ? "ok" : report.healthScore >= 70 ? "warn" : "error"}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {report.requiredPacks.length ? (
                report.requiredPacks.map((p) => (
                  <Badge key={p} tone="accent">
                    {p}
                  </Badge>
                ))
              ) : (
                <Badge tone="ok">Base game only</Badge>
              )}
              {report.requiredMods.map((m) => (
                <Badge key={m.name} tone={m.required ? "warn" : "muted"}>
                  {m.name}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["report", "graph", "manifest", ...(advanced ? (["xml", "stbl"] as const) : [])] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                    tab === t ? "border-primary/50 bg-primary/15" : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t === "stbl" ? "Raw STBL" : t === "xml" ? "Generated XML" : t}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {tab === "report" && <ReportLists report={report} />}
              {tab === "graph" && <GraphView report={report} />}
              {tab === "manifest" && <ManifestTable report={report} />}
              {tab === "xml" && advanced && (
                <CodeBlock text={buildAspirationXml(doc, ctx, keys)} label="aspiration tuning" />
              )}
              {tab === "stbl" && advanced && (
                <CodeBlock
                  text={JSON.stringify(buildStblEntries(doc), null, 2)}
                  label="string table"
                />
              )}
            </div>
          </Panel>

          {advanced && (
            <Panel title="Resource table" subtitle="Instance ids, hex, decimal and FNV inputs.">
              <div className="grid gap-2 sm:grid-cols-2">
                <Stat label="Tuning name" value={keys.tuningName} mono />
                <Stat label="Hash input" value={keys.hashInput} mono />
                <Stat label="Tuning instance" value={`0x${keys.tuning.instance}`} mono />
                <Stat label="Tuning decimal" value={keys.tuningDecimal} mono />
                <Stat label="SimData instance" value={`0x${keys.simData.instance}`} mono />
                <Stat label="FNV32" value={`0x${keys.fnv32}`} mono />
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
  mono,
}: {
  label: string;
  value: string;
  tone?: "muted" | "ok" | "warn" | "error";
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-[12px] font-semibold",
          mono && "font-mono text-[11px]",
          tone === "ok" && "text-emerald-500",
          tone === "warn" && "text-amber-500",
          tone === "error" && "text-red-500",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function ReportLists({ report }: { report: BuildReport }) {
  const block = (title: string, items: string[], tone: "error" | "warn" | "muted") =>
    items.length > 0 && (
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <ul className="space-y-1">
          {items.map((i, n) => (
            <li key={`${title}-${n}`} className="flex items-start gap-2 text-[11.5px]">
              <Badge tone={tone}>{tone === "error" ? "error" : tone === "warn" ? "warning" : "note"}</Badge>
              <span className="min-w-0 flex-1">{i}</span>
            </li>
          ))}
        </ul>
      </div>
    );

  const clean = !report.errors.length && !report.warnings.length && !report.unused.length;
  return (
    <div className="space-y-3">
      {clean && (
        <p className="rounded-md bg-emerald-500/10 px-2.5 py-2 text-[11.5px] text-emerald-500">
          Everything checks out — XML valid, references healthy, no unused resources.
        </p>
      )}
      {block("Errors", report.errors, "error")}
      {block("Warnings", report.warnings, "warn")}
      {block("Unused resources", report.unused, "muted")}
      {block("Suggestions", report.suggestions, "muted")}
      {block("Duplicate ids", report.duplicateIds, "error")}
    </div>
  );
}

function GraphView({ report }: { report: BuildReport }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { nodes, edges, cycles } = report.graph;

  const related = new Set<string>();
  if (selected) {
    const walk = (id: string, dir: "down" | "up") => {
      for (const e of edges) {
        if (dir === "down" && e.from === id && !related.has(e.to)) {
          related.add(e.to);
          walk(e.to, "down");
        }
        if (dir === "up" && e.to === id && !related.has(e.from)) {
          related.add(e.from);
          walk(e.from, "up");
        }
      }
    };
    related.add(selected);
    walk(selected, "down");
    walk(selected, "up");
  }

  const byKind = nodes.reduce<Record<string, typeof nodes>>((acc, n) => {
    acc[n.kind] = [...(acc[n.kind] ?? []), n];
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {cycles.length > 0 && (
        <p className="rounded-md bg-red-500/10 px-2.5 py-2 text-[11.5px] text-red-500">
          Circular dependency detected — export is blocked until it is broken:
          {cycles.map((c, i) => (
            <span key={i} className="mt-1 block font-mono text-[10.5px]">
              {c.join(" → ")}
            </span>
          ))}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Select a resource to highlight everything it depends on and everything that depends on it.
      </p>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(byKind).map(([kind, list]) => (
          <div key={kind} className="rounded-lg border border-border bg-background/50 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {kind} · {list.length}
            </p>
            <div className="space-y-1">
              {list.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelected(selected === n.id ? null : n.id)}
                  className={cn(
                    "w-full truncate rounded-md border px-2 py-1 text-left text-[11px] transition-colors",
                    selected === n.id
                      ? "border-primary bg-primary/15"
                      : selected && related.has(n.id)
                        ? "border-primary/40 bg-primary/5"
                        : selected
                          ? "border-border/50 text-muted-foreground opacity-50"
                          : "border-border hover:bg-muted",
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManifestTable({ report }: { report: BuildReport }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5">Resource</th>
            <th className="px-2 py-1.5">Kind</th>
            <th className="px-2 py-1.5">Type</th>
            <th className="px-2 py-1.5">Group</th>
            <th className="px-2 py-1.5">Instance</th>
            <th className="px-2 py-1.5">Size</th>
            <th className="px-2 py-1.5">Flag</th>
          </tr>
        </thead>
        <tbody>
          {report.manifest.map((r) => (
            <tr key={r.name} className="border-t border-border/60">
              <td className="px-2 py-1.5">{r.name}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{r.kind}</td>
              <td className="px-2 py-1.5 font-mono">{r.type}</td>
              <td className="px-2 py-1.5 font-mono">{r.group}</td>
              <td className="px-2 py-1.5 font-mono">{r.instance}</td>
              <td className="px-2 py-1.5">{formatBytes(r.bytes)}</td>
              <td className="px-2 py-1.5">
                <Badge tone={r.required ? "accent" : "muted"}>{r.required ? "required" : "optional"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ text, label }: { text: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge tone="muted">read only · {label}</Badge>
        <Btn
          icon={Copy}
          onClick={() => {
            void navigator.clipboard.writeText(text);
            toast.success("Copied");
          }}
        >
          Copy
        </Btn>
      </div>
      <pre className="max-h-[420px] overflow-auto rounded-lg border border-border bg-muted/30 p-2 font-mono text-[10.5px] leading-relaxed">
        {text}
      </pre>
    </div>
  );
}
