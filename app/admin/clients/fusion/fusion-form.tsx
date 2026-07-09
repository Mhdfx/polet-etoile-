"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { SelectNatif } from "@/components/ui/select-natif";
import { fusionnerClientsAdmin } from "../actions";

type OptionClient = { id: string; nom: string; commercial: string };

export function FusionClientsForm({ clients }: { clients: OptionClient[] }) {
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [succes, setSucces] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-2"
      action={(formData) => {
        setErreurs({});
        setMessage(undefined);
        setSucces(false);
        startTransition(async () => {
          const resultat = await fusionnerClientsAdmin(Object.fromEntries(formData.entries()));
          if (!resultat.ok) {
            setErreurs(resultat.erreurs ?? {});
            setMessage(resultat.message ?? "Fusion impossible.");
            return;
          }
          setSucces(true);
        });
      }}
    >
      <Champ id="sourceId" label="Client doublon a supprimer" erreur={erreurs.sourceId}>
        <SelectNatif id="sourceId" name="sourceId">
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.nom} - {client.commercial}
            </option>
          ))}
        </SelectNatif>
      </Champ>
      <Champ id="cibleId" label="Client a conserver" erreur={erreurs.cibleId}>
        <SelectNatif id="cibleId" name="cibleId">
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.nom} - {client.commercial}
            </option>
          ))}
        </SelectNatif>
      </Champ>
      <div className="flex items-center gap-3 md:col-span-2">
        <Bouton type="submit" chargement={isPending}>
          Fusionner
        </Bouton>
        {succes ? <p className="text-sm text-emerald-700">Fusion terminee.</p> : null}
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
      </div>
    </form>
  );
}

