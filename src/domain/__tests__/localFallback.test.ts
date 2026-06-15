import { describe, expect, it } from "vitest";
import { parseDecreeFallback } from "../localFallback";

describe("parseDecreeFallback", () => {
  it("does not treat generic disciple mentions as broad recruitment", () => {
    expect(parseDecreeFallback("弟子们今年听令行事").stance).toBe("安抚");
    expect(parseDecreeFallback("弟子需要休整").stance).toBe("安抚");
  });

  it("recognizes broad recruitment only from explicit recruitment wording", () => {
    expect(parseDecreeFallback("广招弟子，开山门纳新").stance).toBe("广招");
    expect(parseDecreeFallback("招募散修补充人手").stance).toBe("广招");
  });

  it("keeps disciple-related training and cultivation commands distinct", () => {
    expect(parseDecreeFallback("严训弟子，操练阵法").stance).toBe("严训");
    expect(parseDecreeFallback("培养内门弟子，点拨核心弟子").stance).toBe("精培");
    expect(parseDecreeFallback("整顿弟子门规").stance).toBe("整肃");
  });
});
