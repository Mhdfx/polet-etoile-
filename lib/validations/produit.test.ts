import { describe, expect, it } from "vitest";
import {
  erreursParChamp,
  schemaChangementPrix,
  schemaCreationProduit,
} from "@/lib/validations/produit";

describe("schemaCreationProduit", () => {
  it("accepte une saisie valide avec prix en virgule francaise", () => {
    const resultat = schemaCreationProduit.safeParse({
      nom: "Poulet entier",
      categorie: "Volaille",
      prix: "45,50",
    });

    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.prix).toBe("45.50");
    }
  });

  it("refuse un nom trop court avec un message francais", () => {
    const resultat = schemaCreationProduit.safeParse({
      nom: "P",
      categorie: "Volaille",
      prix: "45,50",
    });

    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(erreursParChamp(resultat.error).nom).toBe(
        "Le nom doit contenir au moins 2 caractères",
      );
    }
  });

  it("refuse un prix nul, negatif ou invalide", () => {
    for (const prix of ["0", "0,00", "-5", "abc", ""]) {
      const resultat = schemaCreationProduit.safeParse({
        nom: "Poulet entier",
        categorie: "Volaille",
        prix,
      });

      expect(resultat.success).toBe(false);
      if (!resultat.success) {
        expect(erreursParChamp(resultat.error).prix).toBe(
          "Le prix doit être un montant supérieur à 0 (ex. 45,50)",
        );
      }
    }
  });

  it("refuse une categorie vide", () => {
    const resultat = schemaCreationProduit.safeParse({
      nom: "Poulet entier",
      categorie: "  ",
      prix: "45,50",
    });

    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(erreursParChamp(resultat.error).categorie).toBe(
        "La catégorie est obligatoire",
      );
    }
  });
});

describe("schemaChangementPrix", () => {
  it("normalise le nouveau prix", () => {
    const resultat = schemaChangementPrix.safeParse({
      id: "prod-1",
      nouveauPrix: "28,90",
    });

    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.nouveauPrix).toBe("28.90");
    }
  });

  it("refuse plus de deux decimales", () => {
    const resultat = schemaChangementPrix.safeParse({
      id: "prod-1",
      nouveauPrix: "28,905",
    });

    expect(resultat.success).toBe(false);
  });
});
