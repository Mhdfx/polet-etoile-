import { describe, expect, it } from "vitest";
import { ORDRE_COMMANDES_PLUS_RECENTES } from "./commandes-tri";

describe("ordre des commandes", () => {
  it("departage les commandes du meme jour par creation la plus recente", () => {
    expect(ORDRE_COMMANDES_PLUS_RECENTES).toEqual([
      { date_commande: "desc" },
      { created_at: "desc" },
      { numero_bl: "desc" },
    ]);
  });
});
