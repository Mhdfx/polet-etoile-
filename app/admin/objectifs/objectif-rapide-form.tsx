"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/bouton";
import { ChampMontant } from "@/components/champ-montant";
import { definirObjectif } from "../utilisateurs/actions";

export function ObjectifRapideForm({
  utilisateurId,
  mois,
  montantInitial,
}: {
  utilisateurId: string;
  mois: string;
  montantInitial: string;
}) {
  const router = useRouter();
  const [montant, setMontant] = useState(montantInitial);
  const [erreur, setErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(undefined);

    startTransition(async () => {
      const resultat = await definirObjectif({ utilisateurId, mois, montant });

      if (resultat.ok) {
        router.refresh();
        return;
      }

      setErreur(resultat.erreurs?.montant ?? resultat.erreurs?.mois ?? resultat.message ?? "Erreur");
    });
  }

  return (
    <form onSubmit={soumettre} className="flex items-center justify-end gap-2" noValidate>
      <div className="grid gap-1">
        <ChampMontant
          aria-label="Objectif (DH)"
          value={montant}
          onChange={(evenement) => setMontant(evenement.target.value)}
          aria-invalid={Boolean(erreur)}
          className="w-32 text-right"
        />
        {erreur ? <span className="text-xs text-destructive">{erreur}</span> : null}
      </div>
      <Bouton type="submit" size="sm" chargement={enCours}>
        Enregistrer
      </Bouton>
    </form>
  );
}
