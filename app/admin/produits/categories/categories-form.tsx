"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import {
  appliquerPourcentageCategorie,
  enregistrerOrdreCategories,
  renommerCategorieProduit,
} from "../actions";

type ResultatCategorie = Awaited<ReturnType<typeof renommerCategorieProduit>>;

export function CategoriesForm({ categories }: { categories: string[] }) {
  const [message, setMessage] = useState<string>();
  const [succes, setSucces] = useState<string>();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function traiter(resultat: ResultatCategorie, succesMessage: string) {
    if (!resultat.ok) {
      setErreurs(resultat.erreurs ?? {});
      setMessage(resultat.message ?? "Action impossible.");
      setSucces(undefined);
      return;
    }
    setErreurs({});
    setMessage(undefined);
    setSucces(succesMessage);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border"
        action={(formData) => {
          startTransition(async () => {
            traiter(
              await renommerCategorieProduit(Object.fromEntries(formData.entries())),
              "Categorie renommee.",
            );
          });
        }}
      >
        <h2 className="text-sm font-semibold">Renommer une categorie</h2>
        <Champ id="ancienneCategorie" label="Categorie source" erreur={erreurs.ancienneCategorie}>
          <SelectNatif id="ancienneCategorie" name="ancienneCategorie">
            {categories.map((categorie) => (
              <option key={categorie} value={categorie}>
                {categorie}
              </option>
            ))}
          </SelectNatif>
        </Champ>
        <Champ id="nouvelleCategorie" label="Nouveau nom" erreur={erreurs.nouvelleCategorie}>
          <Input id="nouvelleCategorie" name="nouvelleCategorie" />
        </Champ>
        <Bouton type="submit" chargement={isPending}>
          Renommer
        </Bouton>
      </form>

      <form
        className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border"
        action={(formData) => {
          startTransition(async () => {
            traiter(
              await appliquerPourcentageCategorie(Object.fromEntries(formData.entries())),
              "Prix de la categorie mis a jour.",
            );
          });
        }}
      >
        <h2 className="text-sm font-semibold">Prix par pourcentage</h2>
        <Champ id="categorie" label="Categorie" erreur={erreurs.categorie}>
          <SelectNatif id="categorie" name="categorie">
            {categories.map((categorie) => (
              <option key={categorie} value={categorie}>
                {categorie}
              </option>
            ))}
          </SelectNatif>
        </Champ>
        <Champ id="pourcentage" label="Pourcentage" erreur={erreurs.pourcentage}>
          <Input id="pourcentage" name="pourcentage" placeholder="Ex. 5 ou -3" inputMode="decimal" />
        </Champ>
        <Bouton type="submit" chargement={isPending}>
          Appliquer
        </Bouton>
      </form>

      <form
        className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border lg:col-span-2"
        action={(formData) => {
          startTransition(async () => {
            traiter(
              await enregistrerOrdreCategories(Object.fromEntries(formData.entries())),
              "Ordre des categories enregistre.",
            );
          });
        }}
      >
        <h2 className="text-sm font-semibold">Creer / reordonner les categories</h2>
        <Champ
          id="categories"
          label="Categories"
          erreur={erreurs.categories}
          description="Une categorie par ligne. Les categories sans produit sont conservees pour les prochains produits."
        >
          <textarea
            id="categories"
            name="categories"
            defaultValue={categories.join("\n")}
            className="min-h-40 rounded-lg border border-input bg-card px-3 py-2 text-sm"
          />
        </Champ>
        <Bouton type="submit" chargement={isPending}>
          Enregistrer l&apos;ordre
        </Bouton>
      </form>

      {succes ? <p className="text-sm text-emerald-700 lg:col-span-2">{succes}</p> : null}
      {message ? <p className="text-sm text-destructive lg:col-span-2">{message}</p> : null}
    </div>
  );
}
