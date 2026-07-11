"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampMontant } from "@/components/champ-montant";
import { Input } from "@/components/ui/input";
import { definirObjectif } from "../../actions";

export function ObjectifForm({
  utilisateurId,
  moisParDefaut,
}: {
  utilisateurId: string;
  moisParDefaut: string;
}) {
  const router = useRouter();
  const [mois, setMois] = useState(moisParDefaut);
  const [montant, setMontant] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [messageSucces, setMessageSucces] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);
    setMessageSucces(undefined);

    startTransition(async () => {
      const resultat = await definirObjectif({ utilisateurId, mois, montant });

      if (resultat.ok) {
        setMontant("");
        setMessageSucces("Objectif enregistre.");
        router.refresh();
        window.setTimeout(() => window.location.reload(), 100);
        return;
      }

      setErreurs(resultat.erreurs ?? {});
      setMessageErreur(resultat.message);
    });
  }

  return (
    <form
      onSubmit={soumettre}
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      noValidate
    >
      {messageErreur ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {messageErreur}
        </p>
      ) : null}
      {messageSucces ? (
        <p className="rounded-md bg-succes/10 px-3 py-2 text-sm text-succes">
          {messageSucces}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Champ id="objectif-mois" label="Mois" obligatoire erreur={erreurs.mois}>
          <Input
            id="objectif-mois"
            type="month"
            value={mois}
            onChange={(evenement) => setMois(evenement.target.value)}
            aria-invalid={Boolean(erreurs.mois)}
            className="w-44"
          />
        </Champ>

        <Champ
          id="objectif-montant"
          label="Objectif (DH)"
          obligatoire
          erreur={erreurs.montant}
        >
          <ChampMontant
            id="objectif-montant"
            value={montant}
            onChange={(evenement) => setMontant(evenement.target.value)}
            aria-invalid={Boolean(erreurs.montant)}
            className="w-44"
          />
        </Champ>

        <Bouton type="submit" chargement={enCours}>
          Définir l&apos;objectif
        </Bouton>
      </div>
    </form>
  );
}
