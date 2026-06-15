import { describe, expect, it } from "vitest";
import { calculateDivineSenseCost, countDecreeChars, trimDecreeToMaxChars } from "../decreeCost";

describe("decree cost", () => {
  it("does not count punctuation or whitespace as decree chars", () => {
    const decree = "闭门清修，先稳住弟子心气。  不争！";

    expect(countDecreeChars(decree)).toBe(13);
    expect(calculateDivineSenseCost(decree)).toBe(13);
  });

  it("keeps punctuation while limiting counted chars", () => {
    const decree = `${"修".repeat(101)}，，。`;
    const trimmed = trimDecreeToMaxChars(decree);

    expect(countDecreeChars(trimmed)).toBe(100);
    expect(trimmed.endsWith("，，。")).toBe(true);
  });
});
