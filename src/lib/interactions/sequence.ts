/**
 * Sequence step catalogue and flow analysis.
 *
 * A sequence is an ordered, nestable step tree with success / failure / cancel
 * destinations. This module owns what a step *is* (metadata that drives the
 * editor) and what a sequence *does* wrong (reachability, loops, leaks).
 */

import { blankStep, walkSteps, type SequenceStep, type Sequence } from "./schema";

export type StepGroup =
  | "routing" | "animation" | "flow" | "ui" | "audio_vfx" | "gameplay" | "objects" | "control";

export interface StepSpec {
  type: string;
  label: string;
  group: StepGroup;
  /** What the step needs configured before it is valid. */
  needs: ("participant" | "target" | "ref" | "duration" | "condition")[];
  /** Reference kind for the picker, e.g. "buff" or "animation". */
  refKind?: string;
  /** Reservation bookkeeping, used by the leak validator. */
  reserves?: "participant" | "object";
  releases?: "participant" | "object";
  loopStart?: boolean;
  loopEnd?: boolean;
  terminal?: boolean;
  canNest?: boolean;
  description: string;
}

export const STEP_SPECS: StepSpec[] = [
  // Routing / posture
  { type: "route_to_sim", label: "Route to Sim", group: "routing", needs: ["participant", "target"], description: "Walk the participant to another Sim." },
  { type: "route_to_object", label: "Route to object", group: "routing", needs: ["participant", "ref"], refKind: "object", description: "Walk the participant to the target object." },
  { type: "route_to_slot", label: "Route to slot", group: "routing", needs: ["participant", "ref"], refKind: "slot", description: "Route into a specific object slot." },
  { type: "align", label: "Align participants", group: "routing", needs: ["participant", "target"], description: "Face and position two participants for a paired animation." },
  { type: "reserve_object", label: "Reserve object", group: "routing", needs: ["ref"], refKind: "object", reserves: "object", description: "Claim the object so nobody else uses it." },
  { type: "reserve_participant", label: "Reserve participant", group: "routing", needs: ["participant"], reserves: "participant", description: "Claim a Sim for the duration of the interaction." },
  { type: "release_object", label: "Release object", group: "routing", needs: ["ref"], refKind: "object", releases: "object", description: "Give the object back." },
  { type: "release_participant", label: "Release participant", group: "routing", needs: ["participant"], releases: "participant", description: "Free the Sim." },
  { type: "change_posture", label: "Change posture", group: "routing", needs: ["participant", "ref"], refKind: "posture", description: "Enter sitting, lying, carrying and so on." },

  // Animation
  { type: "play_animation", label: "Play animation", group: "animation", needs: ["participant", "ref"], refKind: "animation", description: "Play a single-actor clip." },
  { type: "play_paired_animation", label: "Play paired animation", group: "animation", needs: ["participant", "target", "ref"], refKind: "animation", description: "Play a two-actor clip." },
  { type: "play_object_animation", label: "Play object animation", group: "animation", needs: ["ref"], refKind: "animation", description: "Drive the object's own animation state." },
  { type: "play_facial", label: "Play facial animation", group: "animation", needs: ["participant", "ref"], refKind: "animation", description: "Overlay a facial clip." },
  { type: "loop_start", label: "Start animation loop", group: "animation", needs: ["participant", "ref"], refKind: "animation", loopStart: true, description: "Begin a looping clip that must be stopped later." },
  { type: "loop_stop", label: "Stop animation loop", group: "animation", needs: ["participant"], loopEnd: true, description: "End the running loop." },

  // Flow
  { type: "wait", label: "Wait", group: "flow", needs: ["duration"], description: "Pause for a number of seconds." },
  { type: "run_interaction", label: "Run interaction", group: "flow", needs: ["participant", "ref"], refKind: "interaction", description: "Run another interaction and wait for it." },
  { type: "run_immediate", label: "Run immediate interaction", group: "flow", needs: ["participant", "ref"], refKind: "interaction", description: "Run an immediate interaction inline." },
  { type: "push_interaction", label: "Push interaction", group: "flow", needs: ["participant", "ref"], refKind: "interaction", description: "Queue an interaction without waiting." },
  { type: "run_test", label: "Run test", group: "flow", needs: ["ref"], refKind: "testset", description: "Evaluate a test set and branch on the result." },
  { type: "branch", label: "Conditional branch", group: "flow", needs: ["condition"], canNest: true, description: "Take one of two paths based on a condition." },
  { type: "random_branch", label: "Random branch", group: "flow", needs: [], canNest: true, description: "Pick one nested child at random." },
  { type: "weighted_branch", label: "Weighted random branch", group: "flow", needs: [], canNest: true, description: "Pick a nested child using weights." },
  { type: "repeat", label: "Repeat", group: "flow", needs: ["duration"], canNest: true, loopStart: true, loopEnd: true, description: "Repeat nested steps a fixed number of times." },
  { type: "loop_until", label: "Loop until condition", group: "flow", needs: ["condition"], canNest: true, loopStart: true, loopEnd: true, description: "Repeat nested steps until the condition passes." },
  { type: "end_loop", label: "End loop", group: "flow", needs: [], loopEnd: true, description: "Break out of the enclosing loop." },
  { type: "parallel", label: "Run parallel steps", group: "flow", needs: [], canNest: true, description: "Run nested steps at the same time." },
  { type: "wait_parallel", label: "Wait for parallel steps", group: "flow", needs: [], description: "Join the parallel branch." },
  { type: "join_sim", label: "Join another Sim", group: "flow", needs: ["target"], description: "Let another Sim join the running interaction." },

  // UI
  { type: "show_picker", label: "Show picker", group: "ui", needs: ["ref"], refKind: "picker", description: "Ask the player to choose." },
  { type: "show_dialog", label: "Show dialog", group: "ui", needs: ["ref"], refKind: "dialog", description: "Show a confirmation dialog." },
  { type: "show_notification", label: "Show notification", group: "ui", needs: ["ref"], refKind: "notification", description: "Post a notification." },

  // Audio / VFX
  { type: "play_sound", label: "Play sound", group: "audio_vfx", needs: ["ref"], refKind: "sound", description: "Start a sound event." },
  { type: "stop_sound", label: "Stop sound", group: "audio_vfx", needs: ["ref"], refKind: "sound", description: "Stop a sound event." },
  { type: "start_vfx", label: "Start visual effect", group: "audio_vfx", needs: ["ref"], refKind: "vfx", description: "Start a VFX." },
  { type: "stop_vfx", label: "Stop visual effect", group: "audio_vfx", needs: ["ref"], refKind: "vfx", description: "Stop a VFX." },

  // Gameplay
  { type: "add_buff", label: "Add buff", group: "gameplay", needs: ["participant", "ref"], refKind: "buff", description: "Apply a buff." },
  { type: "remove_buff", label: "Remove buff", group: "gameplay", needs: ["participant", "ref"], refKind: "buff", description: "Remove a buff." },
  { type: "add_trait", label: "Add trait", group: "gameplay", needs: ["participant", "ref"], refKind: "trait", description: "Grant a trait." },
  { type: "remove_trait", label: "Remove trait", group: "gameplay", needs: ["participant", "ref"], refKind: "trait", description: "Remove a trait." },
  { type: "add_rel_bit", label: "Add relationship bit", group: "gameplay", needs: ["participant", "target", "ref"], refKind: "relbit", description: "Add a relationship bit." },
  { type: "remove_rel_bit", label: "Remove relationship bit", group: "gameplay", needs: ["participant", "target", "ref"], refKind: "relbit", description: "Remove a relationship bit." },
  { type: "modify_relationship", label: "Modify relationship", group: "gameplay", needs: ["participant", "target"], description: "Change friendship or romance." },
  { type: "modify_skill", label: "Modify skill", group: "gameplay", needs: ["participant", "ref"], refKind: "skill", description: "Add skill progress." },
  { type: "modify_motive", label: "Modify motive", group: "gameplay", needs: ["participant", "ref"], refKind: "motive", description: "Change a motive." },
  { type: "modify_commodity", label: "Modify commodity", group: "gameplay", needs: ["participant", "ref"], refKind: "commodity", description: "Change a commodity value." },
  { type: "career_performance", label: "Add career performance", group: "gameplay", needs: ["participant"], description: "Change career performance." },
  { type: "add_fame", label: "Add fame", group: "gameplay", needs: ["participant"], description: "Change fame points." },
  { type: "add_reputation", label: "Add reputation", group: "gameplay", needs: ["participant"], description: "Change reputation." },
  { type: "add_currency", label: "Add currency", group: "gameplay", needs: ["participant"], description: "Give Simoleons or another currency." },
  { type: "remove_currency", label: "Remove currency", group: "gameplay", needs: ["participant"], description: "Charge the Sim." },
  { type: "apply_loot", label: "Apply loot", group: "gameplay", needs: ["ref"], refKind: "loot", description: "Run a loot action list." },
  { type: "set_statistic", label: "Set statistic", group: "gameplay", needs: ["participant", "ref"], refKind: "statistic", description: "Set a statistic value." },
  { type: "lock_statistic", label: "Lock statistic", group: "gameplay", needs: ["participant", "ref"], refKind: "statistic", description: "Prevent decay." },
  { type: "unlock_statistic", label: "Unlock statistic", group: "gameplay", needs: ["participant", "ref"], refKind: "statistic", description: "Allow decay again." },

  // Objects / inventory
  { type: "add_inventory", label: "Add inventory item", group: "objects", needs: ["participant", "ref"], refKind: "object", description: "Put an object in an inventory." },
  { type: "remove_inventory", label: "Remove inventory item", group: "objects", needs: ["participant", "ref"], refKind: "object", description: "Take an object out of an inventory." },
  { type: "spawn_object", label: "Spawn object", group: "objects", needs: ["ref"], refKind: "object", reserves: "object", description: "Create an object in the world." },
  { type: "destroy_object", label: "Destroy object", group: "objects", needs: ["ref"], refKind: "object", releases: "object", description: "Remove an object." },
  { type: "change_object_state", label: "Change object state", group: "objects", needs: ["ref"], refKind: "object_state", description: "Set an object state value." },

  // Control / terminal
  { type: "cleanup", label: "Cleanup", group: "control", needs: [], canNest: true, description: "Release everything and tidy up." },
  { type: "complete", label: "Complete interaction", group: "control", needs: [], terminal: true, description: "End successfully." },
  { type: "fail", label: "Fail interaction", group: "control", needs: [], terminal: true, description: "End in failure." },
  { type: "cancel", label: "Cancel interaction", group: "control", needs: [], terminal: true, description: "End as cancelled." },
  { type: "custom_tuning", label: "Custom tuning reference", group: "control", needs: ["ref"], refKind: "tuning", description: "Drop in a raw tuning reference." },
];

export const STEP_BY_TYPE = new Map(STEP_SPECS.map((s) => [s.type, s]));
export const stepSpec = (type: string) => STEP_BY_TYPE.get(type);

export const STEP_GROUP_LABEL: Record<StepGroup, string> = {
  routing: "Routing & posture",
  animation: "Animation",
  flow: "Flow control",
  ui: "Player-facing UI",
  audio_vfx: "Sound & effects",
  gameplay: "Gameplay effects",
  objects: "Objects & inventory",
  control: "Control & cleanup",
};

export function stepLabel(step: SequenceStep): string {
  if (step.label.trim()) return step.label.trim();
  return stepSpec(step.type)?.label ?? step.type;
}

/* -------------------------------------------------------------- presets -- */

const s = (type: string, patch: Partial<SequenceStep> = {}) => blankStep(type, patch);

export interface SequencePreset {
  id: string;
  name: string;
  summary: string;
  build: () => SequenceStep[];
}

export const SEQUENCE_PRESETS: SequencePreset[] = [
  {
    id: "simple_animated",
    name: "Simple animated interaction",
    summary: "Route, reserve, animate, apply loot, release, complete.",
    build: () => [
      s("route_to_object", { participant: "Actor", ref: "target_object" }),
      s("reserve_object", { ref: "target_object" }),
      s("play_animation", { participant: "Actor", durationSec: 5 }),
      s("apply_loot", { ref: "" }),
      s("release_object", { ref: "target_object" }),
      s("complete"),
    ],
  },
  {
    id: "paired_social",
    name: "Paired social interaction",
    summary: "Route both Sims, align, posture, paired animation, split outcomes.",
    build: () => [
      s("route_to_sim", { participant: "Actor", target: "TargetSim" }),
      s("align", { participant: "Actor", target: "TargetSim" }),
      s("change_posture", { participant: "Actor", ref: "standing" }),
      s("play_paired_animation", { participant: "Actor", target: "TargetSim", durationSec: 6 }),
      s("apply_loot", { participant: "Actor" }),
      s("apply_loot", { participant: "TargetSim" }),
      s("modify_relationship", { participant: "Actor", target: "TargetSim" }),
      s("complete"),
    ],
  },
  {
    id: "object_crafting",
    name: "Object crafting interaction",
    summary: "Ingredient tests, progress loop, effects, finished item, skill gain.",
    build: () => [
      s("route_to_object", { participant: "Actor", ref: "crafting_station" }),
      s("reserve_object", { ref: "crafting_station" }),
      s("run_test", { ref: "has_ingredients" }),
      s("remove_inventory", { participant: "Actor", ref: "ingredient" }),
      s("loop_start", { participant: "Actor", durationSec: 10 }),
      s("modify_commodity", { participant: "Actor", ref: "craft_progress" }),
      s("start_vfx", { ref: "craft_sparkle" }),
      s("play_sound", { ref: "craft_loop_sfx" }),
      s("loop_until", { condition: "craft_progress >= 100" }),
      s("loop_stop", { participant: "Actor" }),
      s("spawn_object", { ref: "finished_item" }),
      s("modify_skill", { participant: "Actor", ref: "crafting_skill" }),
      s("release_object", { ref: "crafting_station" }),
      s("complete"),
    ],
  },
  {
    id: "dance_routine",
    name: "Custom dance routine",
    summary: "Assign dancer roles, intro, two routines, random finish, audience reaction.",
    build: () => [
      s("route_to_slot", { participant: "Actor", ref: "dance_mark_a" }),
      s("route_to_slot", { participant: "TargetSim", ref: "dance_mark_b" }),
      s("align", { participant: "Actor", target: "TargetSim" }),
      s("play_animation", { participant: "Actor", ref: "dance_intro", durationSec: 3 }),
      s("play_paired_animation", { participant: "Actor", target: "TargetSim", ref: "dance_routine_a", durationSec: 8 }),
      s("play_paired_animation", { participant: "Actor", target: "TargetSim", ref: "dance_routine_b", durationSec: 8 }),
      s("random_branch", {
        children: [
          s("play_animation", { participant: "Actor", ref: "dance_finish_spin", durationSec: 3 }),
          s("play_animation", { participant: "Actor", ref: "dance_finish_dip", durationSec: 3 }),
        ],
      }),
      s("modify_skill", { participant: "Actor", ref: "dancing_skill" }),
      s("apply_loot", { participant: "Listeners" }),
      s("complete"),
    ],
  },
  {
    id: "timed_looping",
    name: "Timed looping interaction",
    summary: "Loop with per-loop timing events and a clean stop.",
    build: () => [
      s("reserve_object", { ref: "target_object" }),
      s("loop_start", { participant: "Actor", durationSec: 6 }),
      s("repeat", { durationSec: 3, children: [s("modify_motive", { participant: "Actor", ref: "fun" })] }),
      s("loop_stop", { participant: "Actor" }),
      s("release_object", { ref: "target_object" }),
      s("complete"),
    ],
  },
];

/* -------------------------------------------------------------- analysis -- */

export interface FlowIssue {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  stepUuid?: string;
}

const TERMINALS = new Set(["complete", "fail", "cancel", "cleanup"]);

/** Reachability, leaks, loops and missing paths. */
export function analyzeSequence(seq: Sequence): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const all: SequenceStep[] = [];
  walkSteps(seq.steps, (s2) => all.push(s2));
  if (!all.length) return issues;

  const byId = new Map(all.map((x) => [x.uuid, x]));
  const enabled = all.filter((x) => x.enabled);

  // Reachability: top-level order is implicit, jumps are explicit.
  const reachable = new Set<string>();
  const first = seq.entryStep && byId.has(seq.entryStep) ? seq.entryStep : seq.steps[0]?.uuid;
  const queue: string[] = first ? [first] : [];
  const topOrder = seq.steps.map((x) => x.uuid);
  while (queue.length) {
    const id = queue.shift();
    if (!id || reachable.has(id) || !byId.has(id)) continue;
    reachable.add(id);
    const step = byId.get(id);
    if (!step) continue;
    for (const c of step.children) queue.push(c.uuid);
    for (const dest of [step.onSuccess, step.onFailure, step.onCancel]) {
      if (dest && !TERMINALS.has(dest)) queue.push(dest);
    }
    const idx = topOrder.indexOf(id);
    if (idx >= 0 && idx + 1 < topOrder.length) {
      const next = topOrder[idx + 1];
      if (next) queue.push(next);
    }
  }
  for (const step of enabled) {
    if (!reachable.has(step.uuid))
      issues.push({
        level: "warning", code: "unreachable", stepUuid: step.uuid,
        message: `“${stepLabel(step)}” can never run — nothing routes to it.`,
      });
  }

  // Broken jump targets.
  for (const step of all) {
    for (const [field, dest] of [
      ["success", step.onSuccess],
      ["failure", step.onFailure],
      ["cancel", step.onCancel],
    ] as const) {
      if (dest && !TERMINALS.has(dest) && !byId.has(dest))
        issues.push({
          level: "error", code: "broken_branch", stepUuid: step.uuid,
          message: `“${stepLabel(step)}” has a ${field} branch pointing at a step that no longer exists.`,
        });
    }
  }

  // Self-referential jumps with no exit — an infinite loop.
  for (const step of all) {
    if (step.onSuccess === step.uuid)
      issues.push({
        level: "error", code: "infinite_loop", stepUuid: step.uuid,
        message: `“${stepLabel(step)}” loops back into itself on success with no exit.`,
      });
  }
  // Two-step cycles with no terminal escape.
  for (const step of all) {
    const next = step.onSuccess ? byId.get(step.onSuccess) : undefined;
    if (next && next.onSuccess === step.uuid && !next.onFailure && !step.onFailure)
      issues.push({
        level: "error", code: "infinite_loop", stepUuid: step.uuid,
        message: `“${stepLabel(step)}” and “${stepLabel(next)}” point at each other with no way out.`,
      });
  }

  // Reservation / loop / object leaks.
  const reservedObjects: SequenceStep[] = [];
  const reservedSims: SequenceStep[] = [];
  const openLoops: SequenceStep[] = [];
  const spawned: SequenceStep[] = [];
  for (const step of enabled) {
    const spec = stepSpec(step.type);
    if (!spec) continue;
    if (step.type === "spawn_object") spawned.push(step);
    else if (step.type === "destroy_object" || step.type === "add_inventory") spawned.pop();
    else if (spec.reserves === "object") reservedObjects.push(step);
    else if (spec.releases === "object") reservedObjects.pop();
    else if (spec.reserves === "participant") reservedSims.push(step);
    else if (spec.releases === "participant") reservedSims.pop();
    if (spec.loopStart && !spec.loopEnd) openLoops.push(step);
    if (spec.loopEnd && !spec.loopStart) openLoops.pop();
  }
  const hasCleanup = enabled.some((x) => x.type === "cleanup");
  for (const step of reservedObjects)
    issues.push({
      level: hasCleanup ? "warning" : "error", code: "object_not_released", stepUuid: step.uuid,
      message: `Object reserved by “${stepLabel(step)}” is never released.`,
    });
  for (const step of reservedSims)
    issues.push({
      level: hasCleanup ? "warning" : "error", code: "participant_not_released", stepUuid: step.uuid,
      message: `Participant reserved by “${stepLabel(step)}” is never released.`,
    });
  for (const step of openLoops)
    issues.push({
      level: "error", code: "loop_not_stopped", stepUuid: step.uuid,
      message: `The loop started by “${stepLabel(step)}” is never stopped.`,
    });
  for (const step of spawned)
    issues.push({
      level: "warning", code: "object_not_cleaned", stepUuid: step.uuid,
      message: `“${stepLabel(step)}” creates an object that is never stored or destroyed.`,
    });

  // Required paths.
  if (!enabled.some((x) => x.type === "complete") && seq.successPath !== "complete")
    issues.push({ level: "error", code: "missing_success", message: "The sequence has no success path — it never completes." });
  if (!seq.failurePath)
    issues.push({ level: "warning", code: "missing_failure", message: "No failure fallback is configured." });
  if (!hasCleanup && (reservedObjects.length || reservedSims.length || openLoops.length))
    issues.push({ level: "warning", code: "missing_cleanup", message: "This sequence reserves resources but has no cleanup path." });

  // Per-step configuration.
  for (const step of enabled) {
    const spec = stepSpec(step.type);
    if (!spec) {
      issues.push({ level: "error", code: "unknown_step", stepUuid: step.uuid, message: `Unknown step type “${step.type}”.` });
      continue;
    }
    for (const need of spec.needs) {
      const missing =
        (need === "participant" && !step.participant) ||
        (need === "target" && !step.target) ||
        (need === "ref" && !step.ref) ||
        (need === "duration" && !step.durationSec) ||
        (need === "condition" && !step.condition.trim());
      if (missing)
        issues.push({
          level: "warning", code: `missing_${need}`, stepUuid: step.uuid,
          message: `“${stepLabel(step)}” is missing its ${need}.`,
        });
    }
  }

  return issues;
}

/** Human-readable flow, used by the preview. */
export function describeFlow(seq: Sequence, participantLabels: Record<string, string> = {}): string[] {
  const lines: string[] = [];
  walkSteps(seq.steps, (step, depth) => {
    if (!step.enabled) return;
    const who = participantLabels[step.participant] ?? step.participant;
    const spec = stepSpec(step.type);
    const bits = [stepLabel(step)];
    if (who) bits.push(`— ${who}`);
    if (step.target) bits.push(`→ ${participantLabels[step.target] ?? step.target}`);
    if (step.ref) bits.push(`(${step.ref})`);
    if (step.durationSec) bits.push(`· ${step.durationSec}s`);
    if (spec?.terminal) bits.push("· ends here");
    lines.push(`${"  ".repeat(depth)}${bits.join(" ")}`);
  });
  return lines;
}

export function sequenceDuration(seq: Sequence): number {
  let total = 0;
  walkSteps(seq.steps, (s2) => {
    if (s2.enabled) total += s2.durationSec || 0;
  });
  return total;
}
