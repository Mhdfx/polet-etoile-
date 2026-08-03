import type { Prisma } from "@prisma/client";

export const CLE_COMPTEUR_FACTURE = "numero_facture";
const PREFIXE_FACTURE_DEFAUT = "FACT";

export function formaterNumeroFacture(
  compteur: number,
  prefixe = PREFIXE_FACTURE_DEFAUT,
): string {
  return `${prefixe}-${String(compteur).padStart(6, "0")}`;
}

export async function attribuerNumeroFacture(
  tx: Prisma.TransactionClient,
): Promise<{ compteur: number; numeroFacture: string }> {
  await tx.compteurBl.upsert({
    where: { cle: CLE_COMPTEUR_FACTURE },
    create: { cle: CLE_COMPTEUR_FACTURE, valeur: 0 },
    update: {},
  });

  const lignes = await tx.$queryRaw<Array<{ valeur: number }>>`
    SELECT valeur FROM compteurs_bl
    WHERE cle = ${CLE_COMPTEUR_FACTURE}
    FOR UPDATE
  `;
  const valeurActuelle = lignes.at(0)?.valeur;
  if (typeof valeurActuelle !== "number") {
    throw new Error("Compteur facture introuvable");
  }

  const prochainCompteur = valeurActuelle + 1;
  await tx.compteurBl.update({
    where: { cle: CLE_COMPTEUR_FACTURE },
    data: { valeur: prochainCompteur },
  });

  const prefixe = await tx.parametreSysteme.findUnique({
    where: { cle: "prefixe_facture" },
    select: { valeur: true },
  });

  return {
    compteur: prochainCompteur,
    numeroFacture: formaterNumeroFacture(
      prochainCompteur,
      prefixe?.valeur || PREFIXE_FACTURE_DEFAUT,
    ),
  };
}
