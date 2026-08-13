export type SocietePiedDocument = {
  raisonSociale: string;
  adresse?: string;
  rc?: string;
  ice?: string;
  identifiantFiscal?: string;
  patente?: string;
  telephone?: string;
};

export type LignesPiedSociete = {
  principale: string;
  secondaire: string;
};

/** Construit les deux lignes legales communes au BL et a la facture. */
export function construireLignesPiedSociete(
  societe: SocietePiedDocument,
): LignesPiedSociete {
  const principale = societe.adresse
    ? `${societe.raisonSociale}, Siège social : ${societe.adresse}`
    : societe.raisonSociale;
  const secondaire = [
    societe.rc ? `RC : ${societe.rc}` : undefined,
    societe.ice ? `ICE : ${societe.ice}` : undefined,
    societe.identifiantFiscal ? `IF : ${societe.identifiantFiscal}` : undefined,
    societe.patente ? `TP : ${societe.patente}` : undefined,
    societe.telephone ? `Tél : ${societe.telephone}` : undefined,
  ]
    .filter((mention): mention is string => Boolean(mention))
    .join(" - ");

  return { principale, secondaire };
}
