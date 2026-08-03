import { describe, expect, it } from "vitest";
import { trierAlphabetiquement } from "@/lib/tri-alphabetique";

describe("tri alphabetique francais", () => {
  it("trie sans distinguer les accents ni la casse", () => {
    expect(trierAlphabetiquement(["Zagora", "Érrachidia", "agadir"], (x) => x)).toEqual([
      "agadir",
      "Érrachidia",
      "Zagora",
    ]);
  });
});
