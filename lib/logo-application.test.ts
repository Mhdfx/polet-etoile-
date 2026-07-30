import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
import {
  choisirLogoApplication,
  LOGO_APPLICATION_REPLI,
} from "./logo-application";

describe("choisirLogoApplication", () => {
  it("utilise le meme logo configure que les documents", () => {
    expect(
      choisirLogoApplication(
        "/uploads/logos/logo-2e9b36ed-1072-4f2d-8b12-dced4235fdd9.png",
      ),
    ).toBe(
      "/uploads/logos/logo-2e9b36ed-1072-4f2d-8b12-dced4235fdd9.png",
    );
  });

  it.each([undefined, null, "", "/image.png", "https://exemple.test/logo.png"])(
    "revient au cachet officiel si le chemin est absent ou invalide",
    (valeur) => {
      expect(choisirLogoApplication(valeur)).toBe(LOGO_APPLICATION_REPLI);
    },
  );
});
