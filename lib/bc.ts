import type { Prisma } from "@prisma/client";

// Compteur du bon de charge : meme mecanisme transactionnel verrouille que le BL
// (table generique `compteurs_bl`, cle distincte), jamais un max(numero)+1
// applicatif (condition de course) ni un AUTO_INCREMENT (trous apres rollback).
export const CLE_COMPTEUR_BC = "numero_bc";
const PREFIXE_BC_DEFAUT = "BC";

export function formaterNumeroBc(compteur: number, prefixe = PREFIXE_BC_DEFAUT): string {
  return `${prefixe}-${String(compteur).padStart(6, "0")}`;
}

export async function attribuerNumeroBC(tx: Prisma.TransactionClient): Promise<{
  compteur: number;
  numeroBc: string;
}> {
  await tx.compteurBl.upsert({
    where: { cle: CLE_COMPTEUR_BC },
    create: { cle: CLE_COMPTEUR_BC, valeur: 0 },
    update: {},
  });

  const lignes = await tx.$queryRaw<Array<{ valeur: number }>>`
    SELECT valeur FROM compteurs_bl WHERE cle = ${CLE_COMPTEUR_BC} FOR UPDATE
  `;

  const valeurActuelle = lignes.at(0)?.valeur;

  if (typeof valeurActuelle !== "number") {
    throw new Error("Compteur BC introuvable");
  }

  const prochainCompteur = valeurActuelle + 1;

  await tx.compteurBl.update({
    where: { cle: CLE_COMPTEUR_BC },
    data: { valeur: prochainCompteur },
  });

  const prefixe = await tx.parametreSysteme.findUnique({
    where: { cle: "prefixe_bc" },
    select: { valeur: true },
  });

  return {
    compteur: prochainCompteur,
    numeroBc: formaterNumeroBc(prochainCompteur, prefixe?.valeur || PREFIXE_BC_DEFAUT),
  };
}
