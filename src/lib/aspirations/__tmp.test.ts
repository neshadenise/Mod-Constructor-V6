import { describe, it } from "vitest";
import { ASPIRATION_TEMPLATES, docFromTemplate } from "@/lib/aspirations/templates";
import { validateAspiration } from "@/lib/aspirations/validate";

const ctx = { state: { traits: [{ id: "tr1", projectId: "p", name: "x" }], careers: [], aspirations: [], notifications: [], assets: [] } as never, projectId: "p" };

describe("templates", () => {
  it("report", () => {
    for (const t of ASPIRATION_TEMPLATES) {
      const doc = docFromTemplate(t, "MyMods", { rewardTraitId: "tr1" });
      const v = validateAspiration(doc, ctx);
      console.log(`\n== ${t.id} (${t.status}) errors=${v.errors} warnings=${v.warnings} score=${v.score}`);
      for (const i of v.issues.filter((x) => x.level !== "suggestion")) console.log(`   ${i.level} ${i.code} ${i.message}`);
    }
  });
});
