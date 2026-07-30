import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { tools } from "./tools";

// Direct Supabase auth issuer — the project ref is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "mod-constructor-v6",
  title: "Mod Constructor V6",
  version: "1.0.0",
  instructions: [
    "Author Sims 4 gameplay mods inside the user's own Mod Constructor account.",
    "Authentication is the user's Mod Constructor account (OAuth). Never ask for passwords or API keys.",
    "Project selection: call list_projects and get_active_project. If more than one project exists and none is active, ask the user which project to use, then call set_active_project. Never guess.",
    "All modification tools require an explicit project_id or resource_id (stable UUIDs).",
    "Authoring flow: inspect existing resources → propose traits/buffs/interactions/strings → get user approval → call the create/update tools → validate_project → report exactly what was created.",
    "Build truthfulness: creating project data is NOT a compiled package. request_project_build returns the real state; only report a package when the compiler produced it.",
    "Destructive actions (undo_change_set, request_project_build) require confirm: true after the user explicitly approves.",
  ].join(" "),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools,
});
