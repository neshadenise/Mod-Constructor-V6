import { describe, expect, it } from "vitest";
import { serializePackModule } from "@/lib/modexport/pack-serializer";
import { ResourceIdService } from "@/lib/modexport/ids";
import { createPackModule } from "@/lib/packs/factories";

describe("pack generator", () => {
  it("emits snippet tuning + strings", () => {
    const m = createPackModule("club", "p1");
    m.name = "Night Owls";
    const out = serializePackModule(m, { namespace: "khaotik_mod", ids: new ResourceIdService([]) });
    expect(out.length).toBeGreaterThan(0);
    const root = out[out.length - 1]!;
    expect(root.xml).toContain("<I c=\"Snippet\"");
    expect(root.strings.some((s) => s.value === "Night Owls")).toBe(true);
  });
});
