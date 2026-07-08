"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { History, Pencil, Plus, Power, Search, Tags, Trash2 } from "lucide-react";
import { BadgeStatut } from "@/components/badge-statut";
import { Bouton } from "@/components/bouton";
import { DataTable } from "@/components/data-table";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResultatAction } from "@/lib/validations/produit";
import { definirActivationProduit, supprimerProduit } from "./actions";
import {
  BanniereActionEchouee,
  DialoguePrix,
  DialogueProduit,
} from "./produits-dialogs";

export type LigneProduit = {
  id: string;
  nom: string;
  categorie: string;
  unite: string;
  prixReference: string;
  actif: boolean;
  modifieLe: string;
};

type ProduitsTableProps = {
  lignes: LigneProduit[];
  page: number;
  taillePage: number;
  totalLignes: number;
  recherche: string;
  categories: string[];
};

export function ProduitsTable({
  lignes,
  page,
  taillePage,
  totalLignes,
  recherche,
  categories,
}: ProduitsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [enChargement, startTransition] = useTransition();
  const [saisieRecherche, setSaisieRecherche] = useState(recherche);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [produitEnEdition, setProduitEnEdition] = useState<LigneProduit | null>(null);
  const [produitPrix, setProduitPrix] = useState<LigneProduit | null>(null);
  const [messageEchec, setMessageEchec] = useState<string>();

  function naviguer(prochainePage: number, prochaineRecherche: string) {
    const params = new URLSearchParams();
    if (prochaineRecherche) {
      params.set("q", prochaineRecherche);
    }
    if (prochainePage > 1) {
      params.set("page", String(prochainePage));
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function soumettreRecherche(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    naviguer(1, saisieRecherche.trim());
  }

  async function executerAction(action: () => Promise<ResultatAction>) {
    const resultat = await action();
    if (!resultat.ok) {
      setMessageEchec(resultat.message ?? "L'action a échoué. Réessayez.");
    }
  }

  const colonnes = useMemo<ColumnDef<LigneProduit, unknown>[]>(
    () => [
      {
        accessorKey: "nom",
        header: "Produit",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.nom}</span>
        ),
      },
      { accessorKey: "categorie", header: "Catégorie" },
      { accessorKey: "unite", header: "Unité" },
      {
        accessorKey: "prixReference",
        header: () => <span className="block text-right">Prix de référence</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {row.original.prixReference}
          </span>
        ),
      },
      {
        accessorKey: "actif",
        header: "Statut",
        cell: ({ row }) => (
          <BadgeStatut statut={row.original.actif ? "actif" : "inactif"} />
        ),
      },
      { accessorKey: "modifieLe", header: "Modifié le" },
      {
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => {
          const produit = row.original;

          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                title="Modifier"
                onClick={() => setProduitEnEdition(produit)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Changer le prix"
                onClick={() => setProduitPrix(produit)}
              >
                <Tags />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Historique des prix" asChild>
                <Link href={`/admin/produits/${produit.id}/historique`}>
                  <History />
                </Link>
              </Button>
              <DialogueConfirmation
                titre={produit.actif ? "Désactiver le produit ?" : "Activer le produit ?"}
                description={
                  produit.actif
                    ? `« ${produit.nom} » ne sera plus proposé dans les nouvelles commandes. L'historique existant est conservé.`
                    : `« ${produit.nom} » sera de nouveau proposé dans les nouvelles commandes.`
                }
                libelleConfirmer={produit.actif ? "Désactiver" : "Activer"}
                onConfirmer={() =>
                  executerAction(() =>
                    definirActivationProduit(produit.id, !produit.actif),
                  )
                }
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={produit.actif ? "Désactiver" : "Activer"}
                >
                  <Power />
                </Button>
              </DialogueConfirmation>
              <DialogueConfirmation
                danger
                titre="Supprimer le produit ?"
                description={`« ${produit.nom} » sera retiré des listes (suppression logique, tracée dans l'audit). Les commandes passées ne sont pas modifiées.`}
                libelleConfirmer="Supprimer"
                onConfirmer={() => executerAction(() => supprimerProduit(produit.id))}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Supprimer"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </DialogueConfirmation>
            </div>
          );
        },
      },
    ],
    [],
  );

  const messageVide = recherche
    ? `Aucun produit ne correspond à « ${recherche} ».`
    : "Aucun produit dans le catalogue.";

  return (
    <div className="grid gap-4">
      <BanniereActionEchouee
        message={messageEchec}
        onFermer={() => setMessageEchec(undefined)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={soumettreRecherche} className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={saisieRecherche}
              onChange={(evenement) => setSaisieRecherche(evenement.target.value)}
              placeholder="Rechercher un produit…"
              className="w-64 pl-8"
              aria-label="Rechercher un produit"
            />
          </div>
          <Bouton type="submit" variant="outline" chargement={enChargement}>
            Rechercher
          </Bouton>
        </form>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/produits/prix">
              <Tags />
              Prix en masse
            </Link>
          </Button>
          <Button onClick={() => setCreationOuverte(true)}>
            <Plus />
            Nouveau produit
          </Button>
        </div>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={lignes}
        page={page}
        taillePage={taillePage}
        totalLignes={totalLignes}
        chargement={enChargement}
        messageVide={messageVide}
        onPageChange={(prochainePage) => naviguer(prochainePage, recherche)}
      />

      {creationOuverte ? (
        <DialogueProduit
          ouvert
          categories={categories}
          onFermer={() => setCreationOuverte(false)}
        />
      ) : null}

      {produitEnEdition ? (
        <DialogueProduit
          ouvert
          categories={categories}
          produit={{
            id: produitEnEdition.id,
            nom: produitEnEdition.nom,
            categorie: produitEnEdition.categorie,
          }}
          onFermer={() => setProduitEnEdition(null)}
        />
      ) : null}

      {produitPrix ? (
        <DialoguePrix
          ouvert
          produit={{
            id: produitPrix.id,
            nom: produitPrix.nom,
            prixReference: produitPrix.prixReference,
          }}
          onFermer={() => setProduitPrix(null)}
        />
      ) : null}
    </div>
  );
}
