"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Bouton } from "@/components/bouton";
import { ChampMontant } from "@/components/champ-montant";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { changerPrixEnMasse } from "../actions";

type ProduitPrix = {
  id: string;
  nom: string;
  categorie: string;
  prixActuel: string;
};

export function PrixMasseForm({ produits }: { produits: ProduitPrix[] }) {
  const router = useRouter();
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  const lignesModifiees = Object.entries(saisies).filter(
    ([, valeur]) => valeur.trim() !== "",
  );

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);

    startTransition(async () => {
      const resultat = await changerPrixEnMasse({
        lignes: lignesModifiees.map(([id, nouveauPrix]) => ({ id, nouveauPrix })),
      });

      if (resultat.ok) {
        router.push("/admin/produits");
        return;
      }

      setErreurs(resultat.erreurs ?? {});
      setMessageErreur(resultat.message);
    });
  }

  if (produits.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          Aucun produit actif dans le catalogue.
        </p>
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/produits">
              <ArrowLeft />
              Retour aux produits
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="grid gap-4" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/produits">
            <ArrowLeft />
            Retour aux produits
          </Link>
        </Button>
        <Bouton
          type="submit"
          chargement={enCours}
          disabled={lignesModifiees.length === 0}
        >
          Appliquer les changements ({lignesModifiees.length})
        </Bouton>
      </div>

      {messageErreur ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {messageErreur}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Prix actuel</TableHead>
              <TableHead className="w-48 text-right">Nouveau prix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produits.map((produit) => {
              const erreur = erreurs[`prix_${produit.id}`];

              return (
                <TableRow key={produit.id}>
                  <TableCell className="font-medium text-foreground">
                    {produit.nom}
                  </TableCell>
                  <TableCell>{produit.categorie}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {produit.prixActuel}
                  </TableCell>
                  <TableCell>
                    <ChampMontant
                      aria-label={`Nouveau prix pour ${produit.nom}`}
                      value={saisies[produit.id] ?? ""}
                      aria-invalid={Boolean(erreur)}
                      onChange={(evenement) =>
                        setSaisies((precedent) => ({
                          ...precedent,
                          [produit.id]: evenement.target.value,
                        }))
                      }
                    />
                    {erreur ? (
                      <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                        {erreur}
                      </p>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </form>
  );
}
