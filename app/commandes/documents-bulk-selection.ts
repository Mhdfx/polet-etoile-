export type CommandeSelectionnee = {
  id: string;
  numero_bl: string;
  bon_charge: { id: string; numero_bc: string } | null;
};

export type BonChargeInclus = { commandeId: string; bonChargeId: string };
export type BonChargeIgnore = {
  numeroBc?: string;
  numeroBl: string;
  raison: "absent" | "deja_telecharge";
};

export function preparerConsolide({
  commandes,
  portee,
  bonsDeChargeDejaTelecharges,
}: {
  commandes: CommandeSelectionnee[];
  portee: "admin" | "commercial";
  bonsDeChargeDejaTelecharges: Set<string>;
}): {
  inclues: CommandeSelectionnee[];
  exclues: BonChargeIgnore[];
  bonsChargeInclus: BonChargeInclus[];
} {
  const inclues: CommandeSelectionnee[] = [];
  const exclues: BonChargeIgnore[] = [];
  const bonsChargeInclus: BonChargeInclus[] = [];

  for (const commande of commandes) {
    if (!commande.bon_charge) {
      exclues.push({
        numeroBl: commande.numero_bl,
        raison: "absent",
      });
      continue;
    }

    const dejaTelecharge =
      portee === "commercial" &&
      bonsDeChargeDejaTelecharges.has(commande.bon_charge.id);

    if (dejaTelecharge) {
      exclues.push({
        numeroBc: commande.bon_charge.numero_bc,
        numeroBl: commande.numero_bl,
        raison: "deja_telecharge",
      });
      continue;
    }

    inclues.push(commande);
    if (portee === "commercial") {
      bonsChargeInclus.push({
        commandeId: commande.id,
        bonChargeId: commande.bon_charge.id,
      });
    }
  }

  return { inclues, exclues, bonsChargeInclus };
}

export function noteExclusions(exclues: BonChargeIgnore[]): string | undefined {
  if (exclues.length === 0) {
    return undefined;
  }

  const absentes = exclues
    .filter((exclusion) => exclusion.raison === "absent")
    .map((exclusion) => exclusion.numeroBl);
  const dejaTelechargees = exclues
    .filter((exclusion) => exclusion.raison === "deja_telecharge")
    .map((exclusion) => `${exclusion.numeroBl} (${exclusion.numeroBc})`);
  const notes: string[] = [];

  if (absentes.length > 0) {
    notes.push(
      `Commandes sans bon de charge exclues du total : ${absentes.join(", ")}.`,
    );
  }
  if (dejaTelechargees.length > 0) {
    notes.push(
      "Commandes exclues du total : leur bon de charge a deja ete telecharge une fois. " +
        `${dejaTelechargees.join(", ")}. Pour les inclure a nouveau, demandez le document a l'administrateur.`,
    );
  }

  return notes.join(" ");
}
