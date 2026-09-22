/**
 * Notification build generator.
 *
 * Lowers NotificationTemplate records into snippet tuning plus STBL strings.
 * Snippets are used deliberately: they are the one tuning class the game loads
 * without a SimData companion, so notification templates reach a loadable
 * package with this build's capabilities. A notification snippet carries the
 * title/body string refs, the visual style and its buttons so other tuning
 * (careers, aspirations, dynasty events) can reference it by instance id.
 *
 * Nothing is invented — only fields the template actually carries are emitted.
 */

import type { NotificationTemplate } from "@/lib/types";
import {
  doc,
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

export function validateNotificationForExport(model: NotificationTemplate): ValidationResult[] {
  const out: ValidationResult[] = [];
  const label = model.name?.trim() || "Untitled notification";
  if (!model.name?.trim())
    out.push({
      severity: "error",
      code: "NOTIF_NO_NAME",
      message: "Notification has no name. Give it a name so it can be referenced.",
      fieldPath: "name",
    });
  if (!model.title?.trim())
    out.push({
      severity: "error",
      code: "NOTIF_NO_TITLE",
      message: `Notification "${label}" has no title text.`,
      fieldPath: "title",
    });
  if (!model.body?.trim())
    out.push({
      severity: "error",
      code: "NOTIF_NO_BODY",
      message: `Notification "${label}" has no body text.`,
      fieldPath: "body",
    });
  if (!model.visual)
    out.push({
      severity: "error",
      code: "NOTIF_NO_VISUAL",
      message: `Notification "${label}" has no presentation style (toast, modal, banner, milestone or phone).`,
      fieldPath: "visual",
    });
  if (!model.iconAssetId)
    out.push({
      severity: "warning",
      code: "NOTIF_NO_ICON",
      message: `Notification "${label}" has no icon; the game will fall back to the default.`,
      fieldPath: "iconAssetId",
    });
  for (const action of model.actions ?? []) {
    if (!action.label?.trim())
      out.push({
        severity: "warning",
        code: "NOTIF_BLANK_BUTTON",
        message: `Notification "${label}" has a button with no text.`,
        fieldPath: "actions",
      });
  }
  return out;
}

export function serializeNotification(
  model: NotificationTemplate,
  ctx: SerializerContext,
): SerializedTuningResource[] {
  const base = `notification_${slug(model.name)}`;
  const title = stringFor(ctx, "notification", base, "title", model.title);
  const body = stringFor(ctx, "notification", base, "body", model.body);

  const strings = [
    { key: title.key, value: title.value },
    { key: body.key, value: body.value },
  ];
  const stringRefs = [title.ref, body.ref];

  const buttons: string[] = [];
  (model.actions ?? []).forEach((action, i) => {
    if (!action.label?.trim()) return;
    const str = stringFor(ctx, "notification", `${base}_button${i + 1}`, "label", action.label);
    strings.push({ key: str.key, value: str.value });
    stringRefs.push(str.ref);
    buttons.push(`${str.ref}|${action.kind}`);
  });

  const lines = [
    tunable("dialog_title", title.ref),
    tunable("dialog_text", body.ref),
    tunable("ui_style", model.visual),
    model.previewKind ? tunable("notification_level", model.previewKind) : "",
    model.iconAssetId ? tunable("icon", model.iconAssetId) : "",
    buttons.length ? list("responses", buttons) : "",
  ];

  const resourceId = `notification:${model.id}`;
  const key = keyFor(ctx, "snippet", base, resourceId);
  const tuningName = `${ctx.namespace}_${base}`;
  return [
    {
      resourceId,
      kind: "snippet",
      key,
      tuningName,
      className: CLASS_NAME,
      modulePath: MODULE_PATH,
      tuningType: "snippet",
      xml: doc(CLASS_NAME, key.instance, MODULE_PATH, tuningName, "snippet", lines),
      stringRefs,
      strings,
    },
  ];
}
