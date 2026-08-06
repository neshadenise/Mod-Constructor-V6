/**
 * Deterministic identity, XML generation and export for interactions.
 *
 * Every project-owned resource gets its instance from an FNV-1a 64 hash of a
 * namespaced tuning name, so ids are stable across rebuilds and never collide
 * with EA's. EA resources are referenced by name only.
 */

import {
  GROUP_DEFAULT,
  TYPE_STBL,
  TYPE_SIMDATA,
  TYPE_TUNING,
  fnv1a32,
  fnv1a64,
  hex32,
  hex64,
  withHighBit,
} from "@/lib/modexport/ids";
import { stepLabel, stepSpec, describeFlow, sequenceDuration } from "./sequence";
import {
  OUTCOME_LABEL,
  walkSteps,
  type InteractionDoc,
  type Outcome,
  type SequenceStep,
} from "./schema";

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const safe = (s: string) =>
  s.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_{2,}/g, "_") || "untitled";

export interface ResourceKeys {
  tuningName: string;
  hashInput: string;
  instanceHex: string;
  instanceDecimal: string;
  fnv32: string;
}

function keysFor(name: string): ResourceKeys {
  const hashInput = name.toLowerCase();
  const instance = withHighBit(fnv1a64(hashInput));
  return {
    tuningName: name,
    hashInput,
    instanceHex: hex64(instance),
    instanceDecimal: instance.toString(10),
    fnv32: hex32(fnv1a32(hashInput)),
  };
}

export interface InteractionKeys {
  interaction: ResourceKeys;
  simData: ResourceKeys;
  stbl: ResourceKeys;
  loot: Record<string, ResourceKeys>;
  strings: Record<string, ResourceKeys>;
  testSets: Record<string, ResourceKeys>;
}

export function computeInteractionKeys(doc: InteractionDoc): InteractionKeys {
  const ns = (doc.ids.namespace || "MyMods").replace(/[^A-Za-z0-9_.]/g, "");
  const name = `${ns}:${safe(doc.ids.internalName)}`;
  const loot: Record<string, ResourceKeys> = {};
  for (const outcome of doc.outcomes) {
    if (!outcome.enabled || !outcome.effects.length) continue;
    loot[outcome.uuid] = keysFor(`${name}_loot_${outcome.kind}`);
  }
  const strings: Record<string, ResourceKeys> = {};
  for (const field of stringFields(doc)) strings[field.key] = keysFor(`${name}_str_${field.key}`);
  const testSets: Record<string, ResourceKeys> = {};
  for (const uuid of doc.tests.testSets) testSets[uuid] = keysFor(`${name}_testset_${safe(uuid)}`);
  return {
    interaction: keysFor(name),
    simData: keysFor(`${name}_simdata`),
    stbl: keysFor(`${name}_stbl`),
    loot,
    strings,
    testSets,
  };
}

/* -------------------------------------------------------------- strings -- */

export interface StringField {
  key: string;
  label: string;
  text: string;
}

/** Every player-facing string becomes an STBL entry — nothing is hardcoded. */
export function stringFields(doc: InteractionDoc): StringField[] {
  const w = doc.wording;
  const rows: StringField[] = [
    { key: "display_name", label: "Interaction name", text: doc.displayName },
    { key: "pie_menu", label: "Pie menu text", text: w.pieMenu || doc.displayName },
    { key: "tooltip", label: "Tooltip", text: w.tooltip },
    { key: "failure_tooltip", label: "Failure tooltip", text: w.failureTooltip },
    { key: "disabled_tooltip", label: "Disabled tooltip", text: w.disabledTooltip },
    { key: "actor_text", label: "Actor-facing text", text: w.actorText },
    { key: "target_text", label: "Target-facing text", text: w.targetText },
    { key: "notification", label: "Notification", text: w.notification },
    { key: "success_text", label: "Success text", text: w.successText },
    { key: "failure_text", label: "Failure text", text: w.failureText },
    { key: "cancel_text", label: "Cancel text", text: w.cancelText },
    { key: "picker_title", label: "Picker title", text: w.pickerTitle },
    { key: "picker_row", label: "Picker row", text: w.pickerRow },
    { key: "confirm_dialog", label: "Confirmation dialog", text: w.confirmDialog },
    { key: "description", label: "Description", text: doc.description },
  ];
  for (const [participantUuid, text] of Object.entries(w.participantText)) {
    const part = doc.participants.find((p) => p.uuid === participantUuid);
    rows.push({
      key: `participant_${safe(part?.label ?? participantUuid)}`,
      label: `${part?.label ?? "Participant"} text`,
      text,
    });
  }
  for (const outcome of doc.outcomes) {
    if (outcome.enabled && outcome.notificationText)
      rows.push({
        key: `outcome_${outcome.kind}`,
        label: `${OUTCOME_LABEL[outcome.kind]} notification`,
        text: outcome.notificationText,
      });
  }
  return rows.filter((r) => r.text.trim().length > 0);
}

export function buildStbl(doc: InteractionDoc, keys = computeInteractionKeys(doc)) {
  return stringFields(doc).map((f) => ({
    key: f.key,
    label: f.label,
    hash: keys.strings[f.key]?.fnv32 ?? hex32(fnv1a32(f.key)),
    text: f.text,
  }));
}

/* ------------------------------------------------------------------ xml -- */

function participantXml(doc: InteractionDoc): string {
  return doc.participants
    .map((p) => {
      const slot = p.slot === "Custom" ? safe(p.customSlotName || p.label) : p.slot;
      const r = p.restrictions;
      const inner = [
        `<T n="participant">${esc(slot)}</T>`,
        `<T n="label">${esc(p.label)}</T>`,
        `<T n="is_optional">${p.required ? "False" : "True"}</T>`,
        `<T n="allow_multiple">${p.multiple ? "True" : "False"}</T>`,
        r.ages.length ? `<L n="ages">${r.ages.map((a) => `<E>${esc(a.toUpperCase())}</E>`).join("")}</L>` : "",
        r.species.length ? `<L n="species">${r.species.map((a) => `<E>${esc(a.toUpperCase())}</E>`).join("")}</L>` : "",
        r.traits.length ? `<L n="required_traits">${r.traits.map((t) => `<T>${esc(t)}</T>`).join("")}</L>` : "",
        r.buffs.length ? `<L n="required_buffs">${r.buffs.map((t) => `<T>${esc(t)}</T>`).join("")}</L>` : "",
        r.relationshipBits.length ? `<L n="relationship_bits">${r.relationshipBits.map((t) => `<T>${esc(t)}</T>`).join("")}</L>` : "",
        p.animationRole ? `<T n="animation_actor">${esc(p.animationRole)}</T>` : "",
        p.routingRole !== "none" ? `<T n="routing">${esc(p.routingRole)}</T>` : "",
        p.posture ? `<T n="posture">${esc(p.posture)}</T>` : "",
      ]
        .filter(Boolean)
        .map((l) => `      ${l}`)
        .join("\n");
      return `    <U>\n${inner}\n    </U>`;
    })
    .join("\n");
}

function animationXml(doc: InteractionDoc): string {
  if (!doc.animations.length) return "";
  const items = doc.animations
    .map((a) => {
      const roles = a.roles
        .map((r) => {
          const part = doc.participants.find((p) => p.uuid === r.participantUuid);
          return `        <U><T n="actor_name">${esc(r.asmActor)}</T><T n="participant">${esc(part?.slot ?? "Actor")}</T></U>`;
        })
        .join("\n");
      return [
        `    <U>`,
        `      <T n="label">${esc(a.label)}</T>`,
        `      <T n="source">${esc(a.source)}</T>`,
        a.asmKey ? `      <T n="asm_key">${esc(a.asmKey)}</T>` : "",
        a.stateMachine ? `      <T n="state_machine">${esc(a.stateMachine)}</T>` : "",
        a.stateName ? `      <T n="begin_state">${esc(a.stateName)}</T>` : "",
        a.clipName ? `      <T n="clip">${esc(a.clipName)}</T>` : "",
        `      <T n="loop">${a.loop ? "True" : "False"}</T>`,
        a.selector !== "always" ? `      <T n="selection">${esc(a.selector)}</T>` : "",
        a.condition ? `      <T n="selection_condition">${esc(a.condition)}</T>` : "",
        roles ? `      <L n="actors">\n${roles}\n      </L>` : "",
        `    </U>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return `  <L n="animation_elements">\n${items}\n  </L>`;
}

function stepXml(step: SequenceStep, depth = 3): string {
  const pad = "  ".repeat(depth);
  const spec = stepSpec(step.type);
  const children = step.children.length
    ? `\n${pad}  <L n="children">\n${step.children.map((c) => stepXml(c, depth + 2)).join("\n")}\n${pad}  </L>`
    : "";
  const events = step.events.length
    ? `\n${pad}  <L n="timing_events">${step.events
        .map(
          (e) =>
            `<U><T n="at">${esc(e.at)}</T><T n="offset">${e.offsetSec}</T><T n="action">${esc(e.action)}</T><T n="ref">${esc(e.ref)}</T></U>`,
        )
        .join("")}</L>`
    : "";
  return [
    `${pad}<U>`,
    `${pad}  <T n="type">${esc(step.type)}</T>`,
    `${pad}  <T n="label">${esc(stepLabel(step))}</T>`,
    step.participant ? `${pad}  <T n="participant">${esc(step.participant)}</T>` : "",
    step.target ? `${pad}  <T n="target">${esc(step.target)}</T>` : "",
    step.ref ? `${pad}  <T n="reference">${esc(step.ref)}</T>` : "",
    step.durationSec ? `${pad}  <T n="duration">${step.durationSec}</T>` : "",
    step.condition ? `${pad}  <T n="condition">${esc(step.condition)}</T>` : "",
    step.onSuccess ? `${pad}  <T n="on_success">${esc(step.onSuccess)}</T>` : "",
    step.onFailure ? `${pad}  <T n="on_failure">${esc(step.onFailure)}</T>` : "",
    step.onCancel ? `${pad}  <T n="on_cancel">${esc(step.onCancel)}</T>` : "",
    spec?.terminal ? `${pad}  <T n="terminal">True</T>` : "",
    events,
    children,
    `${pad}</U>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function outcomeXml(doc: InteractionDoc, outcome: Outcome, keys: InteractionKeys): string {
  const lootKey = keys.loot[outcome.uuid];
  return [
    `    <U>`,
    `      <T n="result">${esc(outcome.kind)}</T>`,
    `      <T n="weight">${outcome.weight}</T>`,
    outcome.testSet ? `      <T n="test_set">${esc(keys.testSets[outcome.testSet]?.tuningName ?? outcome.testSet)}</T>` : "",
    lootKey ? `      <T n="loot_list">${esc(lootKey.tuningName)}<!--${lootKey.instanceHex}--></T>` : "",
    outcome.notificationText ? `      <T n="notification">${esc(keys.strings[`outcome_${outcome.kind}`]?.fnv32 ?? "")}</T>` : "",
    `    </U>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildInteractionXml(doc: InteractionDoc, keys = computeInteractionKeys(doc)): string {
  const k = keys.interaction;
  const flags = doc.flags;
  const body = [
    `  <T n="display_name">${esc(keys.strings["display_name"]?.fnv32 ?? "")}<!--${esc(doc.displayName)}--></T>`,
    `  <T n="pie_menu_category">${esc(doc.placement.pieMenuCategory)}</T>`,
    keys.strings["tooltip"] ? `  <T n="display_tooltip">${keys.strings["tooltip"].fnv32}</T>` : "",
    keys.strings["failure_tooltip"] ? `  <T n="failure_tooltip">${keys.strings["failure_tooltip"].fnv32}</T>` : "",
    keys.strings["disabled_tooltip"] ? `  <T n="disabled_tooltip">${keys.strings["disabled_tooltip"].fnv32}</T>` : "",
    doc.baseTuning ? `  <T n="base_tuning">${esc(doc.baseTuning)}</T>` : "",
    `  <T n="target_type">${esc(doc.targetType)}</T>`,
    `  <T n="allow_user_directed">${flags.userDirected ? "True" : "False"}</T>`,
    `  <T n="allow_autonomous">${flags.autonomous ? "True" : "False"}</T>`,
    `  <T n="cancelable_by_user">${flags.cancelable ? "True" : "False"}</T>`,
    `  <T n="must_run_next">${flags.mustRun ? "True" : "False"}</T>`,
    `  <T n="joinable">${flags.joinable ? "True" : "False"}</T>`,
    `  <T n="debug">${flags.debugOnly ? "True" : "False"}</T>`,
    `  <T n="visible">${flags.hidden ? "False" : "True"}</T>`,
    `  <T n="queue_behavior">${esc(doc.queueBehavior)}</T>`,
    `  <T n="priority">${esc(doc.priority)}</T>`,
    `  <T n="estimated_duration">${doc.estimatedSeconds}</T>`,
    doc.icon ? `  <T n="icon">${esc(doc.icon)}</T>` : "",
    `  <L n="participants">\n${participantXml(doc)}\n  </L>`,
    doc.tests.testSets.length
      ? `  <L n="tests">${doc.tests.testSets
          .map((u) => `<T>${esc(keys.testSets[u]?.tuningName ?? u)}</T>`)
          .join("")}</L>`
      : "",
    animationXml(doc),
    doc.sequence.steps.length
      ? `  <U n="sequence">\n    <T n="name">${esc(doc.sequence.name)}</T>\n    <L n="steps">\n${doc.sequence.steps
          .map((s) => stepXml(s))
          .join("\n")}\n    </L>\n    <T n="success_path">${esc(doc.sequence.successPath)}</T>\n    <T n="failure_path">${esc(
          doc.sequence.failurePath,
        )}</T>\n    <T n="cancel_path">${esc(doc.sequence.cancelPath)}</T>\n    <T n="cleanup_path">${esc(
          doc.sequence.cleanupPath,
        )}</T>\n  </U>`
      : "",
    doc.outcomes.filter((o) => o.enabled).length
      ? `  <L n="outcomes">\n${doc.outcomes
          .filter((o) => o.enabled)
          .map((o) => outcomeXml(doc, o, keys))
          .join("\n")}\n  </L>`
      : "",
    `  <U n="autonomy">`,
    `    <T n="base_score">${doc.autonomy.baseScore}</T>`,
    `    <T n="cooldown">${doc.autonomy.cooldownMinutes}</T>`,
    `    <T n="max_concurrent">${doc.autonomy.maxConcurrent}</T>`,
    `    <T n="npc_available">${doc.autonomy.npcAvailable ? "True" : "False"}</T>`,
    doc.autonomy.modifiers.length
      ? `    <L n="score_modifiers">${doc.autonomy.modifiers
          .map((m) => `<U><T n="kind">${esc(m.kind)}</T><T n="ref">${esc(m.ref)}</T><T n="value">${m.value}</T></U>`)
          .join("")}</L>`
      : "",
    doc.autonomy.advertisedCommodities.length
      ? `    <L n="advertised">${doc.autonomy.advertisedCommodities
          .map((c) => `<U><T n="statistic">${esc(c.ref)}</T><T n="value">${c.value}</T></U>`)
          .join("")}</L>`
      : "",
    `  </U>`,
    doc.objectReqs.objectTuning || doc.objectReqs.objectTags.length
      ? `  <U n="object_requirements">${[
          doc.objectReqs.objectTuning ? `<T n="object">${esc(doc.objectReqs.objectTuning)}</T>` : "",
          doc.objectReqs.objectTags.length ? `<L n="tags">${doc.objectReqs.objectTags.map((t) => `<T>${esc(t)}</T>`).join("")}</L>` : "",
          doc.objectReqs.slot ? `<T n="slot">${esc(doc.objectReqs.slot)}</T>` : "",
          doc.objectReqs.requiredPosture ? `<T n="posture">${esc(doc.objectReqs.requiredPosture)}</T>` : "",
        ]
          .filter(Boolean)
          .join("")}</U>`
      : "",
    doc.rawFields.length
      ? `  <!-- preserved imported fields -->\n${doc.rawFields
          .map((f) => `  <T n="${esc(f.path)}">${esc(f.value)}</T>`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<!-- Project-owned interaction. EA tuning is never modified. -->`,
    doc.source.mode === "clone"
      ? `<!-- Cloned from ${esc(doc.source.originalTuningName)} (${esc(doc.source.pack || "unknown pack")}) -->`
      : "",
    `<I c="${esc(doc.interactionClass.split(".").pop() ?? "SuperInteraction")}" i="interaction" m="${esc(
      doc.interactionClass.split(".").slice(0, -1).join("."),
    )}" n="${esc(k.tuningName)}" s="${k.instanceDecimal}">`,
    body,
    `</I>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildLootXml(doc: InteractionDoc, outcome: Outcome, keys: InteractionKeys): string {
  const k = keys.loot[outcome.uuid];
  if (!k) return "";
  const ops = outcome.effects
    .map(
      (e) =>
        `    <U><T n="operation">${esc(e.kind)}</T><T n="subject">${esc(e.target)}</T><T n="reference">${esc(
          e.ref,
        )}</T><T n="amount">${e.amount}</T></U>`,
    )
    .join("\n");
  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<I c="LootActions" i="action" m="interactions.utils.loot" n="${esc(k.tuningName)}" s="${k.instanceDecimal}">`,
    `  <L n="loot_actions">`,
    ops,
    `  </L>`,
    `</I>`,
  ].join("\n");
}

/* ------------------------------------------------------------ injection -- */

export function buildXmlInjectorSnippet(doc: InteractionDoc, keys = computeInteractionKeys(doc)): string {
  const targets = doc.placement.targets.length ? doc.placement.targets : ["<object tuning name>"];
  const k = keys.interaction;
  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<!-- Requires XML Injector by Scumbumbo (snippet type: affordance list injection). -->`,
    `<I c="TunableAffordanceListSnippet" i="snippet" m="xml_injector.snippets" n="${esc(
      k.tuningName,
    )}_injection" s="${keysFor(`${k.tuningName}_injection`).instanceDecimal}">`,
    `  <L n="affordance_lists">`,
    ...targets.map((t) => `    <T>${esc(t)}</T>`),
    `  </L>`,
    `  <L n="affordances">`,
    `    <T>${esc(k.tuningName)}<!--${k.instanceHex}--></T>`,
    `  </L>`,
    `</I>`,
  ].join("\n");
}

export function buildScriptInjection(doc: InteractionDoc, keys = computeInteractionKeys(doc)): string {
  const ns = safe(doc.ids.namespace).toLowerCase();
  const module = doc.placement.scriptModule || `${ns}_interactions`;
  const k = keys.interaction;
  return [
    `# ${module}.py — generated by Mod Constructor V6`,
    `# Registers ${k.tuningName} on the configured targets. Safe to re-run: registration is idempotent.`,
    ``,
    `import services`,
    `import sims4.commands`,
    `from sims4.resources import Types`,
    ``,
    `INTERACTION_ID = ${k.instanceDecimal}  # ${k.instanceHex}`,
    `TARGETS = [`,
    ...(doc.placement.targets.length ? doc.placement.targets : ["<object tuning name>"]).map(
      (t) => `    ${JSON.stringify(t)},`,
    ),
    `]`,
    `_REGISTERED = set()`,
    ``,
    `def inject_affordance():`,
    `    manager = services.get_instance_manager(Types.OBJECT)`,
    `    affordance = services.get_instance_manager(Types.INTERACTION).get(INTERACTION_ID)`,
    `    if affordance is None:`,
    `        return`,
    `    for tuning in manager.types.values():`,
    `        if tuning.__name__ not in TARGETS or tuning.__name__ in _REGISTERED:`,
    `            continue`,
    `        tuning._super_affordances += (affordance,)`,
    `        _REGISTERED.add(tuning.__name__)`,
  ].join("\n");
}

/* ------------------------------------------------------------- exporting -- */

export interface ExportFile {
  name: string;
  kind: string;
  contents: string;
  required: boolean;
}

export interface InteractionExport {
  ok: boolean;
  files: ExportFile[];
  manifest: { name: string; kind: string; type: string; group: string; instance: string; bytes: number }[];
  dependencies: string[];
  bytes: number;
  documentation: string;
}

export function exportInteraction(doc: InteractionDoc): InteractionExport {
  const keys = computeInteractionKeys(doc);
  const files: ExportFile[] = [];
  const manifest: InteractionExport["manifest"] = [];

  const add = (
    name: string,
    kind: string,
    contents: string,
    type: string,
    instance: string,
    required = true,
  ) => {
    files.push({ name, kind, contents, required });
    manifest.push({ name, kind, type, group: GROUP_DEFAULT, instance, bytes: contents.length });
  };

  if (doc.source.mode !== "reference") {
    add(
      `${keys.interaction.tuningName.replace(":", "_")}.xml`,
      "Interaction tuning",
      buildInteractionXml(doc, keys),
      TYPE_TUNING,
      keys.interaction.instanceHex,
    );
    add(
      `${keys.simData.tuningName.replace(":", "_")}.simdata.xml`,
      "SimData",
      `<?xml version="1.0" encoding="utf-8"?>\n<!-- SimData stub for ${keys.interaction.tuningName}. -->\n<SimData instance="${keys.simData.instanceHex}" />`,
      TYPE_SIMDATA,
      keys.simData.instanceHex,
    );
  }

  for (const outcome of doc.outcomes) {
    const xml = buildLootXml(doc, outcome, keys);
    const k = keys.loot[outcome.uuid];
    if (xml && k) add(`${k.tuningName.replace(":", "_")}.xml`, "Loot tuning", xml, TYPE_TUNING, k.instanceHex);
  }

  const stbl = buildStbl(doc, keys);
  if (stbl.length)
    add(
      `${keys.stbl.tuningName.replace(":", "_")}.stbl.json`,
      "String table",
      JSON.stringify(
        { locale: "ENG_US", entries: stbl.map((s) => ({ key: s.hash, value: s.text, field: s.key })) },
        null,
        2,
      ),
      TYPE_STBL,
      keys.stbl.instanceHex,
    );

  if (doc.placement.method === "xml_injector")
    add(
      `${keys.interaction.tuningName.replace(":", "_")}_injection.xml`,
      "XML Injector snippet",
      buildXmlInjectorSnippet(doc, keys),
      TYPE_TUNING,
      keysFor(`${keys.interaction.tuningName}_injection`).instanceHex,
    );

  if (doc.placement.method === "script")
    add(
      `${safe(doc.placement.scriptModule || `${doc.ids.namespace}_interactions`).toLowerCase()}.py`,
      "Script injection",
      buildScriptInjection(doc, keys),
      "Script",
      "—",
    );

  for (const set of doc.animationSets) {
    add(
      `${safe(set.name).toLowerCase()}.animset.json`,
      "Custom animation set",
      JSON.stringify(set, null, 2),
      "Animation",
      "—",
      true,
    );
  }

  const dependencies: string[] = [];
  if (doc.placement.method === "xml_injector") dependencies.push("XML Injector (Scumbumbo / TwelfthDoctor1)");
  if (doc.packCompat.requirement === "pack_required") dependencies.push(...doc.packCompat.packs);
  if (doc.source.mode === "reference" && doc.source.pack && doc.source.pack !== "Base Game")
    dependencies.push(doc.source.pack);

  const documentation = buildDocumentation(doc, keys, dependencies);
  add(`${safe(doc.displayName).toLowerCase()}-readme.md`, "Documentation", documentation, "Docs", "—", false);

  return {
    ok: true,
    files,
    manifest,
    dependencies: [...new Set(dependencies)],
    bytes: files.reduce((n, f) => n + f.contents.length, 0),
    documentation,
  };
}

/* -------------------------------------------------------------- readme --- */

export function buildDocumentation(
  doc: InteractionDoc,
  keys = computeInteractionKeys(doc),
  dependencies: string[] = [],
): string {
  const labels: Record<string, string> = {};
  for (const p of doc.participants) labels[p.slot] = p.label;
  const flow = describeFlow(doc.sequence, labels);
  const anims = doc.animations.map((a) => `- ${a.label} (${a.source.replace(/_/g, " ")}${a.asmKey ? `, ASM ${a.asmKey}` : ""})`);
  const outcomes = doc.outcomes
    .filter((o) => o.enabled)
    .map((o) => `- **${OUTCOME_LABEL[o.kind]}** — ${o.effects.length} effect(s)${o.notificationText ? `, notifies the player` : ""}`);

  let steps = 0;
  walkSteps(doc.sequence.steps, () => {
    steps += 1;
  });

  return [
    `# ${doc.displayName}`,
    ``,
    doc.description || "_No description provided._",
    ``,
    `## What it does`,
    `A ${doc.kind.replace(/_/g, " ")} that runs for roughly ${doc.estimatedSeconds}s (sequence timing: ${sequenceDuration(
      doc.sequence,
    )}s across ${steps} steps).`,
    ``,
    `## Where it appears`,
    `- Surfaces: ${doc.placement.surfaces.join(", ") || "not set"}`,
    `- Pie menu category: ${doc.placement.pieMenuCategory || "none"}`,
    `- Placement method: ${doc.placement.method.replace(/_/g, " ")}`,
    ``,
    `## Who can use it`,
    ...doc.participants.map(
      (p) =>
        `- **${p.label}** (${p.slot})${p.required ? "" : " — optional"}${
          p.restrictions.ages.length ? ` · ages: ${p.restrictions.ages.join(", ")}` : ""
        }${p.restrictions.species.length ? ` · species: ${p.restrictions.species.join(", ")}` : ""}`,
    ),
    ``,
    `## Requirements`,
    `- Packs: ${doc.packCompat.packs.join(", ") || "Base game only"}`,
    `- Required object: ${doc.objectReqs.objectTuning || doc.objectReqs.objectTags.join(", ") || "none"}`,
    `- Dependencies: ${dependencies.length ? dependencies.join(", ") : "none"}`,
    ``,
    `## Animations`,
    anims.length ? anims.join("\n") : "_No animations assigned._",
    ``,
    `## Sequence overview`,
    flow.length ? "```text\n" + flow.join("\n") + "\n```" : "_No sequence steps._",
    ``,
    `## Outcomes`,
    outcomes.length ? outcomes.join("\n") : "_No outcomes configured._",
    ``,
    `## Autonomy`,
    doc.autonomy.allowAutonomous
      ? `Autonomous with a base score of ${doc.autonomy.baseScore}, ${doc.autonomy.modifiers.length} score modifier(s) and a ${doc.autonomy.cooldownMinutes} minute cooldown.`
      : "User-directed only — Sims will never choose this on their own.",
    ``,
    `## Known compatibility limitations`,
    doc.packCompat.requirement === "base_game"
      ? "- Base game only; no pack resources are referenced."
      : `- Requires ${doc.packCompat.packs.join(", ")}. Fallback when missing: ${doc.packCompat.fallback.replace(/_/g, " ")}.`,
    doc.source.mode === "clone"
      ? `- Cloned from \`${doc.source.originalTuningName}\`; EA's original resource is untouched and still loads normally.`
      : doc.source.mode === "reference"
        ? `- References EA's \`${doc.source.originalTuningName}\` directly — no copy is shipped.`
        : "- Fully authored in this project.",
    ``,
    `## Installation`,
    `1. Place the generated \`.package\` in your Mods folder.`,
    doc.placement.method === "script"
      ? `2. Place the generated \`.ts4script\` beside it and enable script mods in game options.`
      : doc.placement.method === "xml_injector"
        ? `2. Install XML Injector — this mod will not appear without it.`
        : `2. No extra framework is needed.`,
    `3. Enable custom content and script mods, then restart the game.`,
    ``,
    `## Troubleshooting`,
    `- The interaction never appears: confirm the placement targets (${
      doc.placement.targets.join(", ") || "none set"
    }) match objects that exist on the lot.`,
    `- The Sim resets when it starts: an animation actor is probably unmapped — re-check Animation Setup.`,
    `- Tuning id for support requests: \`${keys.interaction.instanceDecimal}\` (\`0x${keys.interaction.instanceHex}\`).`,
  ].join("\n");
}
