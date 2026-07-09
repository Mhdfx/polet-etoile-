"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { BadgeStatut } from "@/components/badge-statut";
import { Bouton } from "@/components/bouton";
import { DataTable } from "@/components/data-table";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResultatAction } from "@/lib/validations/commun";
import { supprimerClientCommercial } from "./actions";
import {
  BanniereActionEchouee,
  DialogueClientCommercial,
} from "./clients-dialogs";

export type LigneClientCommercial = {
  id: string;
  nom: string;
  regionVille: string;
  telephone: string;
  telephoneBrut: string;
  actif: boolean;
  modifieLe: string;
};

type ClientsCommercialTableProps = {
  lignes: LigneClientCommercial[];
  villes: string[];
  page: number;
  taillePage: number;
  totalLignes: number;
  recherche: string;
};

export function ClientsCommercialTable({
  lignes,
  villes,
  page,
  taillePage,
  totalLignes,
  recherche,
}: ClientsCommercialTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [enChargement, startTransition] = useTransition();
  const [saisieRecherche, setSaisieRecherche] = useState(recherche);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [clientEdition, setClientEdition] =
    useState<LigneClientCommercial | null>(null);
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
      setMessageEchec(resultat.message ?? "L'action a echoue. Reessayez.");
    }
  }

  const colonnes = useMemo<ColumnDef<LigneClientCommercial, unknown>[]>(
    () => [
      {
        accessorKey: "nom",
        header: "Client",
        cell: ({ row }) => (
          <Link
            href={`/commercial/clients/${row.original.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {row.original.nom}
          </Link>
        ),
      },
      { accessorKey: "regionVille", header: "Ville" },
      { accessorKey: "telephone", header: "Telephone" },
      {
        accessorKey: "actif",
        header: "Statut",
        cell: ({ row }) => (
          <BadgeStatut statut={row.original.actif ? "actif" : "inactif"} />
        ),
      },
      { accessorKey: "modifieLe", header: "Modifie le" },
      {
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => {
          const client = row.original;

          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                title="Modifier"
                onClick={() => setClientEdition(client)}
              >
                <Pencil />
              </Button>
              <DialogueConfirmation
                danger
                titre="Supprimer le client ?"
                description={`${client.nom} sera retire de votre liste (suppression logique, tracee dans l'audit).`}
                libelleConfirmer="Supprimer"
                onConfirmer={() =>
                  executerAction(() => supprimerClientCommercial(client.id))
                }
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
              placeholder="Rechercher un client..."
              className="w-64 pl-8"
              aria-label="Rechercher un client"
            />
          </div>
          <Bouton type="submit" variant="outline" chargement={enChargement}>
            Rechercher
          </Bouton>
        </form>

        <Button onClick={() => setCreationOuverte(true)}>
          <Plus />
          Nouveau client
        </Button>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={lignes}
        page={page}
        taillePage={taillePage}
        totalLignes={totalLignes}
        chargement={enChargement}
        messageVide={
          recherche
            ? `Aucun client ne correspond a "${recherche}".`
            : "Aucun client dans votre portefeuille."
        }
        onPageChange={(prochainePage) => naviguer(prochainePage, recherche)}
      />

      {creationOuverte ? (
        <DialogueClientCommercial
          ouvert
          villes={villes}
          onFermer={() => setCreationOuverte(false)}
        />
      ) : null}

      {clientEdition ? (
        <DialogueClientCommercial
          ouvert
          villes={villes}
          client={clientEdition}
          onFermer={() => setClientEdition(null)}
        />
      ) : null}
    </div>
  );
}
