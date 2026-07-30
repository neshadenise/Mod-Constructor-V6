/**
 * Client-safe permission catalog shared by the consent screen, the
 * Connect to ChatGPT page, and the server-side mod service.
 * Keep this module free of any server-only imports.
 */

export const PERMISSIONS = [
  "projects.read",
  "resources.create",
  "resources.update",
  "projects.validate",
  "builds.request",
  "builds.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "projects.read": "View authorized projects",
  "resources.create": "Create project resources",
  "resources.update": "Edit project resources",
  "projects.validate": "Validate projects",
  "builds.request": "Request package builds",
  "builds.read": "Read build results",
};
