import { describe, expect, it } from "vitest";
import en from "./en.json";
import ka from "./ka.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("messages", () => {
  it("ka and en have exactly the same keys", () => {
    expect(keys(ka).sort()).toEqual(keys(en).sort());
  });

  it("has no empty strings", () => {
    for (const [name, msgs] of [["en", en], ["ka", ka]] as const) {
      const empty = keys(msgs).filter((k) => {
        const v = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], msgs);
        return v === "";
      });
      expect(empty, `${name} has empty values`).toEqual([]);
    }
  });
});
