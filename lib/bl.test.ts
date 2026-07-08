import { describe, expect, it } from "vitest";
import { formaterNumeroBl } from "@/lib/bl";

describe("bl", () => {
  it("formate un numéro BL avec préfixe et padding", () => {
    expect(formaterNumeroBl(42, "PE")).toBe("PE-000042");
  });

  it("utilise le préfixe par défaut", () => {
    expect(formaterNumeroBl(1)).toBe("BL-000001");
  });
});
