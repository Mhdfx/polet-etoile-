"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampMontant } from "@/components/champ-montant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ajouterPaiementCommande } from "./actions";

export function PaiementForm({ commandeId }: { commandeId: string }) {
  const [montant, setMontant] = useState("");
  const [modePaiement, setModePaiement] = useState("ESPECES");
  const [reference, setReference] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [enCours, setEnCours] = useState(false);
  const router = useRouter();

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (enCours) {
      return;
    }
    setErreurs({});
    setMessage(undefined);
    setEnCours(true);

    const resultat = await ajouterPaiementCommande({
      commandeId,
      montant,
      modePaiement,
      reference,
    });

    // Le bouton se libere des que la mutation repond ; la revalidation des
    // totaux (paye / reste / statut) suit via router.refresh().
    setEnCours(false);

    if (resultat.ok) {
      setMontant("");
      setReference("");
      router.refresh();
      return;
    }

    setErreurs(resultat.erreurs ?? {});
    setMessage(resultat.message);
  }

  return (
    <form onSubmit={soumettre} className="grid gap-3" noValidate>
      {message ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Champ id="paiement-montant" label="Montant" obligatoire erreur={erreurs.montant}>
          <ChampMontant
            id="paiement-montant"
            value={montant}
            onChange={(evenement) => setMontant(evenement.target.value)}
            aria-invalid={Boolean(erreurs.montant)}
          />
        </Champ>

        <Champ
          id="paiement-mode"
          label="Mode"
          obligatoire
          erreur={erreurs.modePaiement}
        >
          <Select value={modePaiement} onValueChange={setModePaiement}>
            <SelectTrigger id="paiement-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ESPECES">Especes</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
              <SelectItem value="TRAITE">Traite</SelectItem>
              <SelectItem value="AUTRE">Autre</SelectItem>
            </SelectContent>
          </Select>
        </Champ>

        <Champ id="paiement-reference" label="Reference" erreur={erreurs.reference}>
          <Input
            id="paiement-reference"
            value={reference}
            onChange={(evenement) => setReference(evenement.target.value)}
            placeholder="Numero cheque, traite..."
            aria-invalid={Boolean(erreurs.reference)}
          />
        </Champ>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={enCours}
          onClick={() => {
            setMontant("");
            setReference("");
            setMessage(undefined);
            setErreurs({});
          }}
        >
          Effacer
        </Button>
        <Bouton type="submit" chargement={enCours}>
          Enregistrer le paiement
        </Bouton>
      </div>
    </form>
  );
}
