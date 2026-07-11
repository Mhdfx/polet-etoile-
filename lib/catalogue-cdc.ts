/**
 * Catalogue avicole CDC section 14 — source de verite unique.
 * Toute synchro production / seed doit importer depuis ce fichier.
 */

/** Version du catalogue CDC (semver). Incrementer si produits CDC ajoutes/renommes. */
export const CATALOGUE_VERSION = "1.0.0";

export type ProduitCdc = {
  nom: string;
  categorie: string;
  prix_reference: string;
  ordre_affichage: number;
  /** false pour pseudo-produits (RELIQUAT PAYEMENT). */
  suivi_stock?: boolean;
};

/** 26 produits CDC section 14 (annexe catalogue). */
export const PRODUITS_CDC: ProduitCdc[] = [
  { nom: "Abats de poulet", categorie: "Abats", prix_reference: "18.00", ordre_affichage: 10 },
  { nom: "Ailes", categorie: "Découpe", prix_reference: "21.00", ordre_affichage: 20 },
  { nom: "Blanc", categorie: "Découpe", prix_reference: "48.00", ordre_affichage: 30 },
  { nom: "Brochettes de Poulet", categorie: "Élaboré", prix_reference: "55.00", ordre_affichage: 40 },
  { nom: "Carcasse", categorie: "Découpe", prix_reference: "8.00", ordre_affichage: 50 },
  { nom: "Chawarma poulet", categorie: "Élaboré", prix_reference: "52.00", ordre_affichage: 60 },
  { nom: "Coquelet", categorie: "Poulet frais", prix_reference: "32.00", ordre_affichage: 70 },
  { nom: "COU", categorie: "Abats", prix_reference: "11.00", ordre_affichage: 80 },
  { nom: "Cuisse entiere", categorie: "Découpe", prix_reference: "28.00", ordre_affichage: 90 },
  { nom: "Cuisse entiere desossee A Peau", categorie: "Découpe", prix_reference: "42.00", ordre_affichage: 100 },
  { nom: "Cuisse entiere desossee SP", categorie: "Découpe", prix_reference: "45.00", ordre_affichage: 110 },
  { nom: "Emince de poulet", categorie: "Élaboré", prix_reference: "50.00", ordre_affichage: 120 },
  { nom: "FOIE", categorie: "Abats", prix_reference: "18.00", ordre_affichage: 130 },
  { nom: "GESIER", categorie: "Abats", prix_reference: "16.00", ordre_affichage: 140 },
  { nom: "HDC Desosse", categorie: "Découpe", prix_reference: "44.00", ordre_affichage: 150 },
  { nom: "HDC Desosse S Peau", categorie: "Découpe", prix_reference: "46.00", ordre_affichage: 160 },
  { nom: "HDC Os & Peau", categorie: "Découpe", prix_reference: "31.00", ordre_affichage: 170 },
  { nom: "HDC Os & S Peau", categorie: "Découpe", prix_reference: "33.00", ordre_affichage: 180 },
  { nom: "KEFTA NATURE OU EPICE", categorie: "Élaboré", prix_reference: "49.00", ordre_affichage: 190 },
  { nom: "Pau", categorie: "Découpe", prix_reference: "12.00", ordre_affichage: 200 },
  { nom: "Petite Viande", categorie: "Découpe", prix_reference: "20.00", ordre_affichage: 210 },
  { nom: "Pilon", categorie: "Découpe", prix_reference: "25.00", ordre_affichage: 220 },
  { nom: "POULET ENTIER", categorie: "Poulet frais", prix_reference: "23.50", ordre_affichage: 230 },
  { nom: "SAUCISSES NATURE OU EPICE", categorie: "Élaboré", prix_reference: "54.00", ordre_affichage: 240 },
  { nom: "Sot-l'y-laisse", categorie: "Découpe", prix_reference: "58.00", ordre_affichage: 250 },
  {
    nom: "RELIQUAT PAYEMENT",
    categorie: "Règlement",
    prix_reference: "1.00",
    ordre_affichage: 900,
    suivi_stock: false,
  },
];

export function idProduitCdc(ordreAffichage: number): string {
  return `seed-produit-${ordreAffichage}`;
}
