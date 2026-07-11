"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { History, Pencil, Plus, Power, Search, Tags, Trash2 } from "lucide-react";
import { BadgeStatut } from "@/components/badge-statut";
import { Bouton } from "@/components/bouton";
import { DataTable } from "@/components/data-table";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  recherche: string;
  categories: string[];
};

type ConfirmationProduit =
  | { type: "activation"; produit: LigneProduit }
  | { type: "suppression"; produit: LigneProduit };

export function ProduitsTable({
  lignes,
  recherche,
  categories,
}: ProduitsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [enChargement, startTransition] = useTransition();
  const [actionEnCours, startActionTransition] = useTransition();
  const [saisieRecherche, setSaisieRecherche] = useState(recherche);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [produitEnEdition, setProduitEnEdition] = useState<LigneProduit | null>(null);
  const [produitPrix, setProduitPrix] = useState<LigneProduit | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationProduit | null>(null);
  const [messageEchec, setMessageEchec] = useState<string>();

  function naviguer(prochaineRecherche: string) {
    const params = new URLSearchParams();
    if (prochaineRecherche) {
      params.set("q", prochaineRecherche);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function soumettreRecherche(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    naviguer(saisieRecherche.trim());
  }

  async function executerAction(action: () => Promise<ResultatAction>) {
    const resultat = await action();
    if (!resultat.ok) {
      setMessageEchec(resultat.message ?? "L'action a échoué. Réessayez.");
      return;
    }
    setConfirmation(null);
  }

  function confirmerActionProduit() {
    if (!confirmation) {
      return;
    }

    startActionTransition(async () => {
      if (confirmation.type === "activation") {
        await executerAction(() =>
          definirActivationProduit(confirmation.produit.id, !confirmation.produit.actif),
        );
        return;
      }

      await executerAction(() => supprimerProduit(confirmation.produit.id));
    });
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
              <Button
                variant="ghost"
                size="icon-sm"
                title={produit.actif ? "Désactiver" : "Activer"}
                onClick={() => setConfirmation({ type: "activation", produit })}
              >
                <Power />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Supprimer"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmation({ type: "suppression", produit })}
              >
                <Trash2 />
              </Button>
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
        <form
          onSubmit={soumettreRecherche}
          className="flex w-full min-w-0 items-center gap-2 sm:w-auto"
        >
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={saisieRecherche}
              onChange={(evenement) => setSaisieRecherche(evenement.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-8 sm:w-64"
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
        pagination={false}
        chargement={enChargement}
        messageVide={messageVide}
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

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(ouvert) => {
          if (!ouvert && !actionEnCours) {
            setConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation?.type === "suppression"
                ? "Supprimer le produit ?"
                : confirmation?.produit.actif
                  ? "Désactiver le produit ?"
                  : "Activer le produit ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.type === "suppression"
                ? `« ${confirmation.produit.nom} » sera retiré des listes (suppression logique, tracée dans l'audit). Les commandes passées ne sont pas modifiées.`
                : confirmation?.produit.actif
                  ? `« ${confirmation.produit.nom} » ne sera plus proposé dans les nouvelles commandes. L'historique existant est conservé.`
                  : `« ${confirmation?.produit.nom ?? ""} » sera de nouveau proposé dans les nouvelles commandes.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionEnCours}>Annuler</AlertDialogCancel>
            <Button
              variant={confirmation?.type === "suppression" ? "destructive" : "default"}
              disabled={actionEnCours}
              aria-busy={actionEnCours}
              onClick={confirmerActionProduit}
            >
              {confirmation?.type === "suppression"
                ? "Supprimer"
                : confirmation?.produit.actif
                  ? "Désactiver"
                  : "Activer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
