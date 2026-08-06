/**
 * Recursive requirement tree editor.
 *
 * Shared by every builder: the same component edits an aspiration objective
 * gate, a trait unlock condition or a career promotion rule.
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FolderPlus,
  MoveDown,
  MoveUp,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Badge,
  Btn,
  NumberInput,
  SelectInput,
  TextInput,
  Toggle,
} from "@/components/mc/trait/primitives";
import {
  REQUIREMENT_DOMAINS,
  addChild,
  cloneNode,
  describeNode,
  makeGroup,
  makeLeaf,
  moveChild,
  removeNode,
  requirementSpec,
  specsByDomain,
  updateNode,
  defaultParams,
  type GroupOperator,
  type RequirementGroup,
  type RequirementLeaf,
  type RequirementNode,
} from "@/lib/requirements/schema";

interface EditorProps {
  root: RequirementGroup;
  onChange: (next: RequirementGroup) => void;
  /** Node ids flagged by validation. */
  problems?: Record<string, "error" | "warning">;
  compact?: boolean;
}

export function RequirementEditor({ root, onChange, problems = {}, compact }: EditorProps) {
  return (
    <div className="space-y-2">
      <GroupNode
        node={root}
        depth={0}
        isRoot
        problems={problems}
        compact={compact}
        onChange={onChange}
        onPatch={(id, fn) => onChange(updateNode(root, id, fn))}
        onRemove={(id) => onChange(removeNode(root, id))}
        onMove={(id, delta) => onChange(moveChild(root, id, delta))}
        onAdd={(parentId, child) => onChange(addChild(root, parentId, child))}
      />
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Reads as:</span> {describeNode(root)}
      </div>
    </div>
  );
}

interface NodeProps {
  node: RequirementNode;
  depth: number;
  parentId?: string;
  isRoot?: boolean;
  compact?: boolean;
  problems: Record<string, "error" | "warning">;
  onChange: (next: RequirementGroup) => void;
  onPatch: (id: string, fn: (n: RequirementNode) => RequirementNode) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: number) => void;
  onAdd: (parentId: string, child: RequirementNode) => void;
}

const OP_LABEL: Record<GroupOperator, string> = { and: "ALL of", or: "ANY of", not: "NONE of" };

function GroupNode(props: NodeProps & { node: RequirementGroup }) {
  const { node, depth, isRoot, problems, onPatch, onRemove, onMove, onAdd, compact } = props;
  const [open, setOpen] = useState(true);
  const [showMeta, setShowMeta] = useState(false);
  const tone = problems[node.id];

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/40",
        tone === "error" ? "border-red-500/50" : tone === "warning" ? "border-amber-500/50" : "border-border",
        depth > 0 && "ml-3",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-2 py-1.5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <SelectInput
          value={node.op}
          onChange={(v) => onPatch(node.id, (n) => ({ ...(n as RequirementGroup), op: v as GroupOperator }))}
          options={(["and", "or", "not"] as GroupOperator[]).map((o) => ({ value: o, label: OP_LABEL[o] }))}
        />
        <Badge tone="muted">{node.children.length} item(s)</Badge>
        <div className="flex-1" />
        <Btn icon={Plus} onClick={() => onAdd(node.id, makeLeaf())}>
          Test
        </Btn>
        <Btn icon={FolderPlus} onClick={() => onAdd(node.id, makeGroup("or"))}>
          Group
        </Btn>
        {!compact && (
          <Btn onClick={() => setShowMeta((v) => !v)}>{showMeta ? "Hide notes" : "Notes"}</Btn>
        )}
        {!isRoot && (
          <>
            <Btn icon={MoveUp} onClick={() => onMove(node.id, -1)} title="Move up">
              {""}
            </Btn>
            <Btn icon={MoveDown} onClick={() => onMove(node.id, 1)} title="Move down">
              {""}
            </Btn>
            <Btn icon={Trash2} variant="danger" onClick={() => onRemove(node.id)} title="Delete group">
              {""}
            </Btn>
          </>
        )}
      </div>

      {showMeta && (
        <div className="grid gap-2 border-b border-border/60 px-2 py-2 sm:grid-cols-[1fr_100px]">
          <TextInput
            value={node.comment}
            placeholder="Why does this group exist?"
            onChange={(e) => onPatch(node.id, (n) => ({ ...n, comment: e.target.value }))}
          />
          <NumberInput
            value={node.priority}
            onChange={(v) => onPatch(node.id, (n) => ({ ...n, priority: v }))}
          />
        </div>
      )}

      {open && (
        <div className="space-y-2 p-2">
          {node.children.length === 0 && (
            <p className="px-1 text-[11px] text-muted-foreground">
              Empty group — add a test or a nested group.
            </p>
          )}
          {node.children.map((child) =>
            child.kind === "group" ? (
              <GroupNode
                key={child.id}
                {...props}
                node={child}
                parentId={node.id}
                depth={depth + 1}
                isRoot={false}
              />
            ) : (
              <LeafNode key={child.id} {...props} node={child} parentId={node.id} depth={depth + 1} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function LeafNode(props: NodeProps & { node: RequirementLeaf }) {
  const { node, parentId, problems, onPatch, onRemove, onMove, onAdd } = props;
  const spec = requirementSpec(node.specId);
  const tone = problems[node.id];
  const [showMeta, setShowMeta] = useState(false);

  const setParam = (field: string, value: string | number | boolean) =>
    onPatch(node.id, (n) => ({
      ...(n as RequirementLeaf),
      params: { ...(n as RequirementLeaf).params, [field]: value },
    }));

  return (
    <div
      className={cn(
        "rounded-lg border bg-background/60 p-2",
        tone === "error" ? "border-red-500/50" : tone === "warning" ? "border-amber-500/50" : "border-border/70",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <SelectInput
          value={spec.domain}
          onChange={(v) => {
            const first = specsByDomain(v as (typeof REQUIREMENT_DOMAINS)[number]["id"])[0];
            if (first)
              onPatch(node.id, (n) => ({
                ...(n as RequirementLeaf),
                specId: first.id,
                params: defaultParams(first.id),
              }));
          }}
          options={REQUIREMENT_DOMAINS.map((d) => ({ value: d.id, label: d.label }))}
        />
        <SelectInput
          value={node.specId}
          onChange={(v) =>
            onPatch(node.id, (n) => ({
              ...(n as RequirementLeaf),
              specId: v,
              params: defaultParams(v),
            }))
          }
          options={specsByDomain(spec.domain).map((s) => ({ value: s.id, label: s.label }))}
        />
        {spec.packs?.map((p) => (
          <Badge key={p} tone="muted">
            {p}
          </Badge>
        ))}
        <div className="flex-1" />
        <Toggle
          checked={node.negate}
          onChange={(v) => onPatch(node.id, (n) => ({ ...n, negate: v }))}
          label="NOT"
        />
        <Btn onClick={() => setShowMeta((v) => !v)}>{showMeta ? "Hide notes" : "Notes"}</Btn>
        <Btn icon={Copy} onClick={() => parentId && onAdd(parentId, cloneNode(node))} title="Duplicate into group">
          {""}
        </Btn>
        <Btn icon={MoveUp} onClick={() => onMove(node.id, -1)} title="Move up">
          {""}
        </Btn>
        <Btn icon={MoveDown} onClick={() => onMove(node.id, 1)} title="Move down">
          {""}
        </Btn>
        <Btn icon={Trash2} variant="danger" onClick={() => onRemove(node.id)} title="Delete test">
          {""}
        </Btn>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {spec.fields.map((field) => {
          const value = node.params[field.id];
          return (
            <label key={field.id} className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </span>
              {field.type === "select" ? (
                <SelectInput
                  value={String(value ?? field.options?.[0] ?? "")}
                  onChange={(v) => setParam(field.id, v)}
                  options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                />
              ) : field.type === "number" ? (
                <NumberInput
                  value={Number(value ?? 0)}
                  {...(field.min !== undefined ? { min: field.min } : {})}
                  {...(field.max !== undefined ? { max: field.max } : {})}
                  onChange={(v) => setParam(field.id, v)}
                />
              ) : field.type === "bool" ? (
                <Toggle
                  checked={Boolean(value)}
                  onChange={(v) => setParam(field.id, v)}
                  label={field.label}
                />
              ) : (
                <TextInput
                  value={String(value ?? "")}
                  placeholder={field.placeholder ?? ""}
                  onChange={(e) => setParam(field.id, e.target.value)}
                />
              )}
            </label>
          );
        })}
      </div>

      {showMeta && (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_100px]">
          <TextInput
            value={node.comment}
            placeholder="Comment for other creators"
            onChange={(e) => onPatch(node.id, (n) => ({ ...n, comment: e.target.value }))}
          />
          <NumberInput value={node.priority} onChange={(v) => onPatch(node.id, (n) => ({ ...n, priority: v }))} />
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-muted-foreground">{describeNode(node)}</p>
    </div>
  );
}
