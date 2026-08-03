"use client";

import type { ChangeEvent } from "react";

export function CaseSelectionToutesCommandes({
  libelle = "Selectionner toutes les commandes de cette page",
}: {
  libelle?: string;
}) {
  function selectionnerTout(evenement: ChangeEvent<HTMLInputElement>) {
    const formulaire = evenement.currentTarget.form;
    if (!formulaire) return;
    const cases = formulaire.querySelectorAll<HTMLInputElement>(
      'input[data-selection-commande="true"]:not(:disabled)',
    );
    for (const caseCommande of cases) {
      if (caseCommande.getClientRects().length > 0) {
        caseCommande.checked = evenement.currentTarget.checked;
      }
    }
  }

  return (
    <input
      type="checkbox"
      aria-label={libelle}
      title={libelle}
      onChange={selectionnerTout}
      className="size-4 accent-primary"
    />
  );
}
