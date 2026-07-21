import { defineTool } from "@lovable.dev/mcp-js";
import { jsonContent } from "../shared";

/**
 * Snippets are curated XML/tuning fragments the app ships in the Snippets
 * Library workspace. This tool exposes their names/categories so a chat
 * assistant can reference them; full bodies stay in-app to keep responses
 * small.
 */
const BUILT_IN_SNIPPETS = [
  { id: "snip_buff_basic", name: "Basic Buff", category: "Buff", language: "xml" },
  { id: "snip_loot_money", name: "Loot: Add Simoleons", category: "Loot", language: "xml" },
  { id: "snip_loot_stat", name: "Loot: Modify Stat", category: "Loot", language: "xml" },
  { id: "snip_test_age", name: "Test: Age Gate", category: "Test", language: "xml" },
  { id: "snip_test_trait", name: "Test: Has Trait", category: "Test", language: "xml" },
  { id: "snip_int_social", name: "Interaction: Social", category: "Interaction", language: "xml" },
];

export default {
  name: "list_snippets",
  title: "List snippets",
  description: "List Mod Constructor V6's built-in XML/tuning snippets (buffs, loots, tests, interactions).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => jsonContent({ snippets: BUILT_IN_SNIPPETS }),
};
