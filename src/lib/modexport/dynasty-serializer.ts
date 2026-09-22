/**
 * Custom Dynasty build generator.
 *
 * Lowers a DynastyDoc into snippet tuning plus STBL strings. Snippets are used
 * deliberately: they are the one tuning class the game loads without a SimData
 * companion, so a dynasty reaches a loadable package with this build's
 * capabilities. Each dynasty emits:
 *
 *   - one root snippet carrying identity, size limits and child references;
 *   - one snippet per hierarchy role (rank, seats, permissions);
 *   - one snippet per dynasty value (score range and its effects).
 *
 * Nothing is invented — only fields the document actually carries are emitted.
 */

import type { DynastyDoc } from "@/lib/dynasty/schema";
import {
  doc as tuningDoc,
  keyFor,
  list,
  slug,
  stringFor,
  tunable,
  type SerializedTuningResource,
  type SerializerContext,
  type ValidationResult,
} from "./serializers";

const MODULE_PATH = "snippets.snippet";
const CLASS_NAME = "Snippet";

const label = (d: DynastyDoc) =>
  d.identity?.displayName?.trim() || d.identity?.typeName?.trim() || "Untitled dynasty";

export function validateDynastyForExport(d: DynastyDoc): ValidationResult[] {
  const out: ValidationResult[] = [];
  const name = label(d);

  if (!d.identity?.displayName?.trim())
    out.push({
      severity: "error",
      code: "DYNASTY_NO_NAME",
      message: "Dynasty has no display name.",
      fieldPath: "identity.displayName",
    });
  if (!d.identity?.internalName?.trim() && !d.identity?.displayName?.trim())
    out.push({
      severity: "error",
      code: "DYNASTY_NO_ID",
      message: `Dynasty "${name}" has no internal name to build an id from.`,
      fieldPath: "identity.internalName",
    });
  if (!d.identity?.description?.trim())
    out.push({
      severity: "error",
      code: "DYNASTY_NO_DESCRIPTION",
      message: `Dynasty "${name}" has no description; the game shows one in the dynasty panel.`,
      fieldPath: "identity.description",
    });

  const roles = d.hierarchy?.roles ?? [];
  if (!roles.length)
    out.push({
      severity: "error",
      code: "DYNASTY_NO_ROLES",
      message: `Dynasty "${name}" has no hierarchy roles. Add at least a leader role.`,
      fieldPath: "hierarchy.roles",
    });
  for (const role of roles) {
    if (!role.displayName?.trim())
      out.push({
        severity: "error",
        code: "DYNASTY_ROLE_NO_NAME",
        message: `Dynasty "${name}" has a role with no name.`,
        fieldPath: "hierarchy.roles",
      });
    if (role.maxSims > 0 && role.minSims > role.maxSims)
      out.push({
        severity: "error",
        code: "DYNASTY_ROLE_BAD_SEATS",
        message: `Role "${role.displayName}" in "${name}" has a minimum (${role.minSims}) above its maximum (${role.maxSims}).`,
        fieldPath: "hierarchy.roles",
      });
  }

  const size = d.size;
  if (size && size.maxMembers > 0 && size.minMembers > size.maxMembers)
    out.push({
      severity: "error",
      code: "DYNASTY_BAD_SIZE",
      message: `Dynasty "${name}" allows a minimum of ${size.minMembers} members but a maximum of ${size.maxMembers}.`,
      fieldPath: "size",
    });

  for (const value of d.values ?? []) {
    if (!value.name?.trim())
      out.push({
        severity: "error",
        code: "DYNASTY_VALUE_NO_NAME",
        message: `Dynasty "${name}" has a value with no name.`,
        fieldPath: "values",
      });
    if (value.min > value.max)
      out.push({
        severity: "error",
        code: "DYNASTY_VALUE_BAD_RANGE",
        message: `Value "${value.name}" in "${name}" has a minimum above its maximum.`,
        fieldPath: "values",
      });
  }

  if (!d.identity?.icon?.id && !d.identity?.crest?.id)
    out.push({
      severity: "warning",
      code: "DYNASTY_NO_ICON",
      message: `Dynasty "${name}" has no icon or crest; the game will fall back to the default.`,
      fieldPath: "identity.icon",
    });

  return out;
}

export function serializeDynasty(
  d: DynastyDoc,
  ctx: SerializerContext,
): SerializedTuningResource[] {
  const name = label(d);
  const base = d.identity?.internalName?.trim() || `dynasty_${slug(name)}`;
  const out: SerializedTuningResource[] = [];

  const emit = (
    localName: string,
    resourceId: string,
    body: string[],
    strings: { key: string; value: string }[],
    stringRefs: string[],
  ) => {
    const key = keyFor(ctx, "snippet", localName, resourceId);
    const tuningName = `${ctx.namespace}_${localName}`;
    out.push({
      resourceId,
      kind: "snippet",
      key,
      tuningName,
      className: CLASS_NAME,
      modulePath: MODULE_PATH,
      tuningType: "snippet",
      xml: tuningDoc(CLASS_NAME, key.instance, MODULE_PATH, tuningName, "snippet", body),
      stringRefs,
      strings,
    });
    return BigInt("0x" + key.instance).toString();
  };

  /* ------------------------------------------------------------- roles -- */
  const roleRefs: string[] = [];
  for (const role of d.hierarchy?.roles ?? []) {
    const localName = `${base}_role_${slug(role.internalName || role.displayName)}`;
    const nameStr = stringFor(ctx, "snippet", localName, "name", role.displayName);
    const descStr = stringFor(ctx, "snippet", localName, "description", role.description);
    roleRefs.push(
      emit(
        localName,
        `dynasty:${d.uuid}:role:${role.uuid}`,
        [
          tunable("display_name", nameStr.ref),
          tunable("description", descStr.ref),
          tunable("role_kind", role.kind),
          tunable("rank", role.rank),
          tunable("hierarchy_level", role.hierarchyLevel),
          tunable("min_sims", role.minSims),
          tunable("max_sims", role.maxSims),
          tunable("unique", role.unique),
          tunable("succession_eligible", role.successionEligible),
          tunable("may_recruit", role.mayRecruit),
          tunable("may_punish", role.mayPunish),
          tunable("may_reward", role.mayReward),
          role.trait?.id ? tunable("role_trait", role.trait.id) : "",
          role.buff?.id ? tunable("role_buff", role.buff.id) : "",
        ],
        [
          { key: nameStr.key, value: nameStr.value },
          { key: descStr.key, value: descStr.value },
        ],
        [nameStr.ref, descStr.ref],
      ),
    );
  }

  /* ------------------------------------------------------------ values -- */
  const valueRefs: string[] = [];
  for (const value of d.values ?? []) {
    const localName = `${base}_value_${slug(value.name)}`;
    const nameStr = stringFor(ctx, "snippet", localName, "name", value.name);
    const descStr = stringFor(ctx, "snippet", localName, "description", value.description);
    valueRefs.push(
      emit(
        localName,
        `dynasty:${d.uuid}:value:${value.uuid}`,
        [
          tunable("display_name", nameStr.ref),
          tunable("description", descStr.ref),
          tunable("initial_value", value.score),
          tunable("min_value", value.min),
          tunable("max_value", value.max),
          tunable("prestige_effect", value.prestigeEffect),
          tunable("unity_effect", value.unityEffect),
          tunable("relationship_effect", value.relationshipEffect),
          value.buff?.id ? tunable("value_buff", value.buff.id) : "",
        ],
        [
          { key: nameStr.key, value: nameStr.value },
          { key: descStr.key, value: descStr.value },
        ],
        [nameStr.ref, descStr.ref],
      ),
    );
  }

  /* -------------------------------------------------------------- root -- */
  const nameStr = stringFor(ctx, "snippet", base, "name", d.identity.displayName);
  const descStr = stringFor(ctx, "snippet", base, "description", d.identity.description);
  const strings = [
    { key: nameStr.key, value: nameStr.value },
    { key: descStr.key, value: descStr.value },
  ];
  const stringRefs = [nameStr.ref, descStr.ref];

  let mottoRef = "";
  if (d.identity.motto?.trim()) {
    const motto = stringFor(ctx, "snippet", base, "motto", d.identity.motto);
    strings.push({ key: motto.key, value: motto.value });
    stringRefs.push(motto.ref);
    mottoRef = motto.ref;
  }

  emit(
    base,
    `dynasty:${d.uuid}`,
    [
      tunable("display_name", nameStr.ref),
      tunable("description", descStr.ref),
      mottoRef ? tunable("motto", mottoRef) : "",
      tunable("membership_structure", d.membership?.structure ?? ""),
      tunable("min_members", d.size?.minMembers ?? 0),
      tunable("max_members", d.size?.maxMembers ?? 0),
      tunable("succession_mode", d.succession?.mode ?? ""),
      d.identity.icon?.id ? tunable("icon", d.identity.icon.id) : "",
      d.identity.crest?.id ? tunable("crest", d.identity.crest.id) : "",
      d.identity.requiredPack ? tunable("required_pack", d.identity.requiredPack) : "",
      roleRefs.length ? list("roles", roleRefs) : "",
      valueRefs.length ? list("values", valueRefs) : "",
    ],
    strings,
    stringRefs,
  );

  return out;
}
