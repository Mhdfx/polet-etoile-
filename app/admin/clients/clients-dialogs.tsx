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
  creerClientAdmin,
  creerClientExterne,
  modifierClientAdmin,
  modifierClientExterne,
} from "./actions";

type ErreursChamps = Record<string, string>;

export type OptionCommercial = {
  id: string;
  nomComplet: string;
  nomUtilisateur: string;
};

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

function SelectVille({
  id,
  value,
  onChange,
  villes,
  invalide,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  villes: string[];
  invalide: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalide}>
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
  );
}

type DialogueClientAdminProps = {
  ouvert: boolean;
  onFermer: () => void;
  onSucces?: () => void;
  villes: string[];
  commerciaux: OptionCommercial[];
  client?: {
    id: string;
    nom: string;
    regionVille: string;
    telephoneBrut: string;
    commercialId: string;
  };
};

export function DialogueClientAdmin({
  ouvert,
  onFermer,
  onSucces,
  villes,
  commerciaux,
  client,
}: DialogueClientAdminProps) {
  const edition = Boolean(client);
  const [nom, setNom] = useState(client?.nom ?? "");
  const [regionVille, setRegionVille] = useState(client?.regionVille ?? "");
  const [telephone, setTelephone] = useState(client?.telephoneBrut ?? "");
  const [commercialId, setCommercialId] = useState(client?.commercialId ?? "");
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);

    startTransition(async () => {
      const entree = { id: client?.id, nom, regionVille, telephone, commercialId };
      const resultat: ResultatAction = client
        ? await modifierClientAdmin(entree)
        : await creerClientAdmin(entree);

      if (resultat.ok) {
        onSucces?.();
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
            Le client standard est toujours rattache a un commercial actif.
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
            <SelectVille
              id="client-ville"
              value={regionVille}
              onChange={setRegionVille}
              villes={villes}
              invalide={Boolean(erreurs.regionVille)}
            />
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

          <Champ
            id="client-commercial"
            label="Commercial"
            obligatoire
            erreur={erreurs.commercialId}
          >
            <Select value={commercialId} onValueChange={setCommercialId}>
              <SelectTrigger
                id="client-commercial"
                className="w-full"
                aria-invalid={Boolean(erreurs.commercialId)}
              >
                <SelectValue placeholder="Choisir un commercial" />
              </SelectTrigger>
              <SelectContent>
                {commerciaux.map((commercial) => (
                  <SelectItem key={commercial.id} value={commercial.id}>
                    {commercial.nomComplet} ({commercial.nomUtilisateur})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

type DialogueClientExterneProps = {
  ouvert: boolean;
  onFermer: () => void;
  onSucces?: () => void;
  villes: string[];
  client?: {
    id: string;
    nom: string;
    regionVille: string;
    telephoneBrut: string;
  };
};

export function DialogueClientExterne({
  ouvert,
  onFermer,
  onSucces,
  villes,
  client,
}: DialogueClientExterneProps) {
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
      const resultat = client
        ? await modifierClientExterne(entree)
        : await creerClientExterne(entree);

      if (resultat.ok) {
        onSucces?.();
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
          <DialogTitle>
            {edition ? "Modifier le client externe" : "Nouveau client externe"}
          </DialogTitle>
          <DialogDescription>
            Les clients externes sont geres par l&apos;administration et utilises pour
            les commandes hors portefeuille commercial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={soumettre} className="grid gap-4" noValidate>
          <BanniereErreur message={messageErreur} />

          <Champ
            id="client-externe-nom"
            label="Nom du client externe"
            obligatoire
            erreur={erreurs.nom}
          >
            <Input
              id="client-externe-nom"
              value={nom}
              onChange={(evenement) => setNom(evenement.target.value)}
              placeholder="Ex. Traiteur evenementiel"
              aria-invalid={Boolean(erreurs.nom)}
            />
          </Champ>

          <Champ
            id="client-externe-ville"
            label="Ville"
            obligatoire
            erreur={erreurs.regionVille}
          >
            <SelectVille
              id="client-externe-ville"
              value={regionVille}
              onChange={setRegionVille}
              villes={villes}
              invalide={Boolean(erreurs.regionVille)}
            />
          </Champ>

          <Champ
            id="client-externe-telephone"
            label="Telephone"
            erreur={erreurs.telephone}
          >
            <Input
              id="client-externe-telephone"
              value={telephone}
              onChange={(evenement) => setTelephone(evenement.target.value)}
              placeholder="Ex. 05 22 00 00 00"
              aria-invalid={Boolean(erreurs.telephone)}
            />
          </Champ>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={enCours} onClick={onFermer}>
              Annuler
            </Button>
            <Bouton type="submit" chargement={enCours}>
              {edition ? "Enregistrer" : "Creer le client externe"}
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
