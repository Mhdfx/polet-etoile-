"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampMontant } from "@/components/champ-montant";
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
import type { ResultatAction } from "@/lib/validations/produit";
import {
  changerPrixProduit,
  creerProduit,
  modifierProduit,
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

function ListeCategories({ id, categories }: { id: string; categories: string[] }) {
  return (
    <datalist id={id}>
      {categories.map((categorie) => (
        <option key={categorie} value={categorie} />
      ))}
    </datalist>
  );
}

type DialogueProduitProps = {
  ouvert: boolean;
  onFermer: () => void;
  categories: string[];
  /** Absent = creation ; present = edition (le prix se change via l'action dediee). */
  produit?: { id: string; nom: string; categorie: string };
};

export function DialogueProduit({
  ouvert,
  onFermer,
  categories,
  produit,
}: DialogueProduitProps) {
  const edition = Boolean(produit);
  const [nom, setNom] = useState(produit?.nom ?? "");
  const [categorie, setCategorie] = useState(produit?.categorie ?? "");
  const [prix, setPrix] = useState("");
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);

    startTransition(async () => {
      const resultat: ResultatAction = produit
        ? await modifierProduit({ id: produit.id, nom, categorie })
        : await creerProduit({ nom, categorie, prix });

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
          <DialogTitle>{edition ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          <DialogDescription>
            {edition
              ? "Le prix de référence se modifie via l'action « Changer le prix »."
              : "Le produit sera immédiatement disponible pour les nouvelles commandes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={soumettre} className="grid gap-4" noValidate>
          <BanniereErreur message={messageErreur} />

          <Champ id="produit-nom" label="Nom du produit" obligatoire erreur={erreurs.nom}>
            <Input
              id="produit-nom"
              value={nom}
              onChange={(evenement) => setNom(evenement.target.value)}
              placeholder="Ex. Poulet entier"
              aria-invalid={Boolean(erreurs.nom)}
            />
          </Champ>

          <Champ
            id="produit-categorie"
            label="Catégorie"
            obligatoire
            erreur={erreurs.categorie}
            description="Choisir une catégorie existante ou en saisir une nouvelle."
          >
            <Input
              id="produit-categorie"
              list="produit-categories"
              value={categorie}
              onChange={(evenement) => setCategorie(evenement.target.value)}
              placeholder="Ex. Découpe"
              aria-invalid={Boolean(erreurs.categorie)}
            />
            <ListeCategories id="produit-categories" categories={categories} />
          </Champ>

          {!edition ? (
            <Champ
              id="produit-prix"
              label="Prix de référence"
              obligatoire
              erreur={erreurs.prix}
              description="Montant HT en dirhams, au kg."
            >
              <ChampMontant
                id="produit-prix"
                value={prix}
                onChange={(evenement) => setPrix(evenement.target.value)}
                aria-invalid={Boolean(erreurs.prix)}
              />
            </Champ>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={enCours} onClick={onFermer}>
              Annuler
            </Button>
            <Bouton type="submit" chargement={enCours}>
              {edition ? "Enregistrer" : "Créer le produit"}
            </Bouton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DialoguePrixProps = {
  ouvert: boolean;
  onFermer: () => void;
  produit: { id: string; nom: string; prixReference: string };
};

export function DialoguePrix({ ouvert, onFermer, produit }: DialoguePrixProps) {
  const [nouveauPrix, setNouveauPrix] = useState("");
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);

    startTransition(async () => {
      const resultat = await changerPrixProduit({ id: produit.id, nouveauPrix });

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
          <DialogTitle>Changer le prix — {produit.nom}</DialogTitle>
          <DialogDescription>
            Prix actuel : {produit.prixReference}. Les commandes déjà passées ne
            seront pas modifiées (prix figé à la commande).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={soumettre} className="grid gap-4" noValidate>
          <BanniereErreur message={messageErreur} />

          <Champ
            id="produit-nouveau-prix"
            label="Nouveau prix de référence"
            obligatoire
            erreur={erreurs.nouveauPrix}
          >
            <ChampMontant
              id="produit-nouveau-prix"
              value={nouveauPrix}
              onChange={(evenement) => setNouveauPrix(evenement.target.value)}
              aria-invalid={Boolean(erreurs.nouveauPrix)}
            />
          </Champ>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={enCours} onClick={onFermer}>
              Annuler
            </Button>
            <Bouton type="submit" chargement={enCours}>
              Changer le prix
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
