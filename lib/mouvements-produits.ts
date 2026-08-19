import Decimal from "decimal.js";
import { arrondirQuantite, type EntreeDecimal } from "@/lib/decimal";

export type TypeMouvementProduit = "CHARGE" | "VENTE" | "RETOUR";

export type MouvementProduitJournalier = {
  produitId: string;
  type: TypeMouvementProduit;
  quantite: EntreeDecimal;
  /** Jour local Africa/Casablanca au format AAAA-MM-JJ. */
  jour: string;
};

export type ProduitMouvementReference = {
  id: string;
  nom: string;
  actif: boolean;
};

export type ResumeMouvementProduit = {
  produitId: string;
  nom: string;
  actif: boolean;
  charge: Decimal;
  vendu: Decimal;
  retourne: Decimal;
  ecart: Decimal;
  nombreMouvements: number;
  dernierJour: string | null;
};

export type PointMouvementJournalier = {
  jour: string;
  charge: Decimal;
  vendu: Decimal;
  retourne: Decimal;
};

/**
 * Projection pure des mouvements physiques. Les produits sont la liste de
 * reference : un produit sans mouvement reste donc visible avec des zeros.
 * La formule d'ecart est la meme que le rapprochement de tournee.
 */
export function agregerMouvementsProduits(
  produits: ProduitMouvementReference[],
  mouvements: MouvementProduitJournalier[],
): ResumeMouvementProduit[] {
  const resumes = new Map<string, ResumeMouvementProduit>();

  for (const produit of produits) {
    resumes.set(produit.id, {
      produitId: produit.id,
      nom: produit.nom,
      actif: produit.actif,
      charge: new Decimal(0),
      vendu: new Decimal(0),
      retourne: new Decimal(0),
      ecart: new Decimal(0),
      nombreMouvements: 0,
      dernierJour: null,
    });
  }

  for (const mouvement of mouvements) {
    const resume = resumes.get(mouvement.produitId);
    if (!resume) continue;

    const quantite = arrondirQuantite(mouvement.quantite);
    if (mouvement.type === "CHARGE") resume.charge = resume.charge.plus(quantite);
    if (mouvement.type === "VENTE") resume.vendu = resume.vendu.plus(quantite);
    if (mouvement.type === "RETOUR") resume.retourne = resume.retourne.plus(quantite);
    resume.nombreMouvements += 1;
    if (!resume.dernierJour || mouvement.jour > resume.dernierJour) {
      resume.dernierJour = mouvement.jour;
    }
  }

  return [...resumes.values()]
    .map((resume) => ({
      ...resume,
      charge: arrondirQuantite(resume.charge),
      vendu: arrondirQuantite(resume.vendu),
      retourne: arrondirQuantite(resume.retourne),
      ecart: arrondirQuantite(resume.charge.minus(resume.vendu).minus(resume.retourne)),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
}

export function agregerMouvementsParJour(
  mouvements: MouvementProduitJournalier[],
): PointMouvementJournalier[] {
  const jours = new Map<string, PointMouvementJournalier>();

  for (const mouvement of mouvements) {
    const point = jours.get(mouvement.jour) ?? {
      jour: mouvement.jour,
      charge: new Decimal(0),
      vendu: new Decimal(0),
      retourne: new Decimal(0),
    };
    const quantite = arrondirQuantite(mouvement.quantite);
    if (mouvement.type === "CHARGE") point.charge = point.charge.plus(quantite);
    if (mouvement.type === "VENTE") point.vendu = point.vendu.plus(quantite);
    if (mouvement.type === "RETOUR") point.retourne = point.retourne.plus(quantite);
    jours.set(mouvement.jour, point);
  }

  return [...jours.values()]
    .sort((a, b) => a.jour.localeCompare(b.jour))
    .map((point) => ({
      ...point,
      charge: arrondirQuantite(point.charge),
      vendu: arrondirQuantite(point.vendu),
      retourne: arrondirQuantite(point.retourne),
    }));
}
