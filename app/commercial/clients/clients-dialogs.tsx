"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResultatAction } from "@/lib/validations/commun";
import {
  creerClientCommercial,
  modifierClientCommercial,
} from "./actions";

type ErreursChamps = Record<string, string>;

function BanniereErreur({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

type DialogueClientCommercialProps = {
  ouvert: boolean;
  onFermer: () => void;
  villes: string[];
  client?: {
    id: string;
    nom: string;
    regionVille: string;
    telephoneBrut: string;
  };
};

export function DialogueClientCommercial({
  ouvert,
  onFermer,
  villes,
  client,
}: DialogueClientCommercialProps) {
  const edition = Boolean(client);
  const [nom, setNom] = useState(client?.nom ?? "");
  const [regionVille, setRegionVille] = useState(client?.regionVille ?? "");
  const [telephone, setTelephone] = useState(client?.telephoneBrut ?? "");
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);

    startTransition(async () => {
      const entree = { id: client?.id, nom, regionVille, telephone };
      const resultat: ResultatAction = client
        ? await modifierClientCommercial(entree)
        : await creerClientCommercial(entree);

      if (resultat.ok) {
        onFermer();
        return;
      }

      setErreurs(resultat.erreurs ?? {});
      setMessageErreur(resultat.message);
    });
  }

  return (
    <Dialog open={ouvert} onOpenChange={(prochain) => (!prochain && !enCours ? onFermer() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edition ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          <DialogDescription>
            Ce client restera rattache a votre compte commercial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={soumettre} className="grid gap-4" noValidate>
          <BanniereErreur message={messageErreur} />

          <Champ id="client-nom" label="Nom du client" obligatoire erreur={erreurs.nom}>
            <Input
              id="client-nom"
              value={nom}
              onChange={(evenement) => setNom(evenement.target.value)}
              placeholder="Ex. Boucherie Atlas"
              aria-invalid={Boolean(erreurs.nom)}
            />
          </Champ>

          <Champ
            id="client-ville"
            label="Ville"
            obligatoire
            erreur={erreurs.regionVille}
          >
            <Select value={regionVille || undefined} onValueChange={setRegionVille}>
              <SelectTrigger
                id="client-ville"
                className="w-full"
                aria-invalid={Boolean(erreurs.regionVille)}
              >
                <SelectValue placeholder="Choisir une ville" />
              </SelectTrigger>
              <SelectContent>
                {villes.map((ville) => (
                  <SelectItem key={ville} value={ville}>
                    {ville}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Champ>

          <Champ id="client-telephone" label="Telephone" erreur={erreurs.telephone}>
            <Input
              id="client-telephone"
              value={telephone}
              onChange={(evenement) => setTelephone(evenement.target.value)}
              placeholder="Ex. 06 00 00 00 00"
              aria-invalid={Boolean(erreurs.telephone)}
            />
          </Champ>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={enCours} onClick={onFermer}>
              Annuler
            </Button>
            <Bouton type="submit" chargement={enCours}>
              {edition ? "Enregistrer" : "Creer le client"}
            </Bouton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BanniereActionEchouee({
  message,
  onFermer,
}: {
  message?: string;
  onFermer: () => void;
}): ReactNode {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <span>{message}</span>
      <button type="button" className="font-semibold underline" onClick={onFermer}>
        Fermer
      </button>
    </div>
  );
}
