import { describe, expect, it } from "vitest";
import { buildCoverPrompt } from "@/lib/cover/prompt";

describe("career cover prompts", () => {
  it("uses only the career name as the automatic subject for a main cover", () => {
    const prompt = buildCoverPrompt({
      careerName: "Professional Wrestling",
      careerDescription: "A misleading office description",
      branchName: undefined,
      branchDescription: "A branch detail that must not leak",
      category: "Business",
      promotionTitles: ["Intern", "Executive"],
    });

    expect(prompt).toContain('career named "Professional Wrestling"');
    expect(prompt).not.toContain("office description");
    expect(prompt).not.toContain("branch detail");
    expect(prompt).not.toContain("Intern");
    expect(prompt).not.toContain("Executive");
  });

  it("uses the career and selected branch names for a branch cover", () => {
    const prompt = buildCoverPrompt({
      careerName: "Professional Wrestling",
      branchName: "High-Flying Superstar",
      branchDescription: "Ignore this prose",
    });

    expect(prompt).toContain('career named "Professional Wrestling"');
    expect(prompt).toContain('"High-Flying Superstar" branch');
    expect(prompt).toContain("exact title and branch name");
    expect(prompt).not.toContain("Ignore this prose");
  });
});