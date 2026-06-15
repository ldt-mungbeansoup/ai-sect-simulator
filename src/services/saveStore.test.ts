import { afterEach, describe, expect, it, vi } from "vitest";
import type { SectState } from "../domain/types";
import { loadSavedState, saveState } from "./saveStore";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key)
});

afterEach(() => {
  store.clear();
});

describe("saveStore", () => {
  it("normalizes missing divine sense when loading old saves", () => {
    store.set("sect-simulator-save-v1", JSON.stringify({ year: 3 }));

    expect(loadSavedState()?.divineSense).toBe(100);
  });

  it("normalizes divine sense before saving", () => {
    saveState({ year: 3, divineSense: undefined } as unknown as SectState);

    const raw = store.get("sect-simulator-save-v1");
    expect(raw ? JSON.parse(raw).divineSense : undefined).toBe(100);
  });

  it("clamps divine sense before saving", () => {
    saveState({ year: 3, divineSense: 150 } as SectState);

    const raw = store.get("sect-simulator-save-v1");
    expect(raw ? JSON.parse(raw).divineSense : undefined).toBe(100);
  });
});
