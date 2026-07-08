import type { Prisma } from "@prisma/client";

const CLE_COMPTEUR_BL = "numero_bl";
const PREFIXE_BL_DEFAUT = "BL";

export function formaterNumeroBl(compteur: number, prefixe = PREFIXE_BL_DEFAUT): string {
  return `${prefixe}-${String(compteur).padStart(6, "0")}`;
}

export async function attribuerNumeroBL(tx: Prisma.TransactionClient): Promise<{
  compteur: number;
  numeroBl: string;
}> {
  await tx.compteurBl.upsert({
    where: { cle: CLE_COMPTEUR_BL },
    create: { cle: CLE_COMPTEUR_BL, valeur: 0 },
    update: {},
  });

  const lignes = await tx.$queryRaw<Array<{ valeur: number }>>`
    SELECT valeur FROM compteurs_bl WHERE cle = ${CLE_COMPTEUR_BL} FOR UPDATE
  `;

  const valeurActuelle = lignes.at(0)?.valeur;

  if (typeof valeurActuelle !== "number") {
    throw new Error("Compteur BL introuvable");
  }

  const prochainCompteur = valeurActuelle + 1;

  await tx.compteurBl.update({
    where: { cle: CLE_COMPTEUR_BL },
    data: { valeur: prochainCompteur },
  });

  const prefixe = await tx.parametreSysteme.findUnique({
    where: { cle: "prefixe_bl" },
    select: { valeur: true },
  });

  return {
    compteur: prochainCompteur,
    numeroBl: formaterNumeroBl(prochainCompteur, prefixe?.valeur || PREFIXE_BL_DEFAUT),
  };
}
