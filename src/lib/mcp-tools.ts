/**
 * MCP tool definitions surfaced to ChatGPT when Mod Constructor V6 runs as
 * a ChatGPT App (OpenAI Apps SDK).
 *
 * This module is a UI-side scaffold — it documents the tool contract that
 * the MCP backend will implement. Each tool has:
 *   - name         : stable identifier used in the ChatGPT tool call
 *   - description  : short summary shown to the model
 *   - inputShape   : lightweight description (real schema lives server-side)
 *
 * NO authentication is performed here. ChatGPT users are already
 * authenticated with OpenAI; this app never sees passwords or tokens.
 */

export interface McpToolDef {
  name: string;
  description: string;
  inputShape: string;
  category: "project" | "content" | "validation" | "assets" | "export";
}

export const MCP_TOOL_DEFS: readonly McpToolDef[] = [
  {
    name: "project.create",
    description: "Create a new Mod Constructor project.",
    inputShape: "{ name: string, author?: string }",
    category: "project",
  },
  {
    name: "project.update",
    description: "Update project metadata (name, author, description, version).",
    inputShape: "{ id: string, patch: Partial<ProjectMeta> }",
    category: "project",
  },
  {
    name: "career.create",
    description: "Create a Sims 4 career with ranks, branches, salary and schedule.",
    inputShape: "{ project: string, career: CareerInput }",
    category: "content",
  },
  {
    name: "career.update",
    description: "Update fields on an existing career.",
    inputShape: "{ id: string, patch: Partial<CareerInput> }",
    category: "content",
  },
  {
    name: "trait.create",
    description: "Create a Sims 4 trait with buffs, modifiers and special cases.",
    inputShape: "{ project: string, trait: TraitInput }",
    category: "content",
  },
  {
    name: "trait.update",
    description: "Update fields on an existing trait.",
    inputShape: "{ id: string, patch: Partial<TraitInput> }",
    category: "content",
  },
  {
    name: "aspiration.create",
    description: "Create a Sims 4 aspiration with tiers and rewards.",
    inputShape: "{ project: string, aspiration: AspirationInput }",
    category: "content",
  },
  {
    name: "aspiration.update",
    description: "Update fields on an existing aspiration.",
    inputShape: "{ id: string, patch: Partial<AspirationInput> }",
    category: "content",
  },
  {
    name: "fields.validate",
    description: "Validate one or more record fields against V5 schema rules.",
    inputShape: "{ kind: RecordKind, data: unknown }",
    category: "validation",
  },
  {
    name: "assets.saveGeneratedImage",
    description:
      "Persist an image (produced by ChatGPT native image generation) into the project's Assets, in a named folder.",
    inputShape: "{ folder: string, name: string, dataUrl: string, attachTo?: RecordRef }",
    category: "assets",
  },
  {
    name: "assets.attachToRecord",
    description: "Attach an existing asset as the icon or image of a record.",
    inputShape: "{ assetId: string, target: { kind: RecordKind, id: string, slot: 'icon' | 'image' } }",
    category: "assets",
  },
  {
    name: "project.export",
    description:
      "Export the current project as a Portable Bundle (.mcbundle.json) the standalone desktop app can import.",
    inputShape: "{ id: string }",
    category: "export",
  },
];
