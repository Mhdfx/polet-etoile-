"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { BadgeStatut } from "@/components/badge-statut";
import { Bouton } from "@/components/bouton";
import { DataTable } from "@/components/data-table";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResultatAction } from "@/lib/validations/commun";
import { supprimerClientAdmin, supprimerClientExterne } from "./actions";
import {
  BanniereActionEchouee,
  DialogueClientAdmin,
  DialogueClientExterne,
  type OptionCommercial,
} from "./clients-dialogs";

export type LigneClientAdmin = {
  id: string;
  nom: string;
  regionVille: string;
  telephone: string;
  telephoneBrut: string;
  commercialId: string;
  commercial: string;
  commercialIdentifiant: string;
  actif: boolean;
  modifieLe: string;
};

export type LigneClientExterne = {
  id: string;
  nom: string;
  regionVille: string;
  telephone: string;
  telephoneBrut: string;
  actif: boolean;
  modifieLe: string;
};

type AdminClientsTableProps = {
  lignes: LigneClientAdmin[];
  lignesExternes: LigneClientExterne[];
  commerciaux: OptionCommercial[];
  villes: string[];
  page: number;
  pageExternes: number;
  taillePage: number;
  totalLignes: number;
  totalLignesExternes: number;
  recherche: string;
  rechercheExternes: string;
};

export function AdminClientsTable({
  lignes,
  lignesExternes,
  commerciaux,
  villes,
  page,
  pageExternes,
  taillePage,
  totalLignes,
  totalLignesExternes,
  recherche,
  rechercheExternes,
}: AdminClientsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [enChargement, startTransition] = useTransition();
  const [saisieRecherche, setSaisieRecherche] = useState(recherche);
  const [saisieRechercheExternes, setSaisieRechercheExternes] =
    useState(rechercheExternes);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [creationExterneOuverte, setCreationExterneOuverte] = useState(false);
  const [clientEdition, setClientEdition] = useState<LigneClientAdmin | null>(null);
  const [clientExterneEdition, setClientExterneEdition] =
    useState<LigneClientExterne | null>(null);
  const [messageEchec, setMessageEchec] = useState<string>();

  function naviguer(prochains: {
    page?: number;
    recherche?: string;
    pageExternes?: number;
    rechercheExternes?: string;
  }) {
    const params = new URLSearchParams();
    const prochaineRecherche = prochains.recherche ?? recherche;
    const prochaineRechercheExternes =
      prochains.rechercheExternes ?? rechercheExternes;
    const prochainePage = prochains.page ?? page;
    const prochainePageExternes = prochains.pageExternes ?? pageExternes;

    if (prochaineRecherche) {
      params.set("q", prochaineRecherche);
    }
    if (prochainePage > 1) {
      params.set("page", String(prochainePage));
    }
    if (prochaineRechercheExternes) {
      params.set("qExternes", prochaineRechercheExternes);
    }
    if (prochainePageExternes > 1) {
      params.set("pageExternes", String(prochainePageExternes));
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function soumettreRecherche(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    naviguer({ page: 1, recherche: saisieRecherche.trim() });
  }

  function soumettreRechercheExternes(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    naviguer({
      pageExternes: 1,
      rechercheExternes: saisieRechercheExternes.trim(),
    });
  }

  async function executerAction(action: () => Promise<ResultatAction>) {
    const resultat = await action();
    if (!resultat.ok) {
      setMessageEchec(resultat.message ?? "L'action a echoue. Reessayez.");
    }
  }

  const colonnesClients = useMemo<ColumnDef<LigneClientAdmin, unknown>[]>(
    () => [
      {
        accessorKey: "nom",
        header: "Client",
        cell: ({ row }) => (
          <Link
            href={`/admin/clients/${row.original.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {row.original.nom}
          </Link>
        ),
      },
      { accessorKey: "regionVille", header: "Ville" },
      { accessorKey: "telephone", header: "Telephone" },
      {
        accessorKey: "commercial",
        header: "Commercial",
        cell: ({ row }) => (
          <div>
            <p>{row.original.commercial}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.commercialIdentifiant}
            </p>
          </div>
        ),
      },
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
                description={`${client.nom} sera retire des listes (suppression logique, tracee dans l'audit). Les commandes existantes restent conservees.`}
                libelleConfirmer="Supprimer"
                onConfirmer={() =>
                  executerAction(() => supprimerClientAdmin(client.id))
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

  const colonnesExternes = useMemo<ColumnDef<LigneClientExterne, unknown>[]>(
    () => [
      {
        accessorKey: "nom",
        header: "Client externe",
        cell: ({ row }) => (
          <Link
            href={`/admin/clients/externes/${row.original.id}`}
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
                onClick={() => setClientExterneEdition(client)}
              >
                <Pencil />
              </Button>
              <DialogueConfirmation
                danger
                titre="Supprimer le client externe ?"
                description={`${client.nom} sera retire des listes (suppression logique, tracee dans l'audit).`}
                libelleConfirmer="Supprimer"
                onConfirmer={() =>
                  executerAction(() => supprimerClientExterne(client.id))
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
    <div className="grid gap-6">
      <BanniereActionEchouee
        message={messageEchec}
        onFermer={() => setMessageEchec(undefined)}
      />

      <section className="grid gap-4">
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

          <Button
            onClick={() => setCreationOuverte(true)}
            disabled={commerciaux.length === 0}
            title={
              commerciaux.length === 0
                ? "Aucun commercial actif disponible"
                : "Nouveau client"
            }
          >
            <Plus />
            Nouveau client
          </Button>
        </div>

        <DataTable
          colonnes={colonnesClients}
          donnees={lignes}
          page={page}
          taillePage={taillePage}
          totalLignes={totalLignes}
          chargement={enChargement}
          messageVide={
            recherche
              ? `Aucun client ne correspond a "${recherche}".`
              : "Aucun client standard."
          }
          onPageChange={(prochainePage) => naviguer({ page: prochainePage })}
        />
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form
            onSubmit={soumettreRechercheExternes}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={saisieRechercheExternes}
                onChange={(evenement) =>
                  setSaisieRechercheExternes(evenement.target.value)
                }
                placeholder="Rechercher un client externe..."
                className="w-64 pl-8"
                aria-label="Rechercher un client externe"
              />
            </div>
            <Bouton type="submit" variant="outline" chargement={enChargement}>
              Rechercher
            </Bouton>
          </form>

          <Button onClick={() => setCreationExterneOuverte(true)} variant="outline">
            <UserPlus />
            Client externe
          </Button>
        </div>

        <DataTable
          colonnes={colonnesExternes}
          donnees={lignesExternes}
          page={pageExternes}
          taillePage={taillePage}
          totalLignes={totalLignesExternes}
          chargement={enChargement}
          messageVide={
            rechercheExternes
              ? `Aucun client externe ne correspond a "${rechercheExternes}".`
              : "Aucun client externe."
          }
          onPageChange={(prochainePage) =>
            naviguer({ pageExternes: prochainePage })
          }
        />
      </section>

      {creationOuverte ? (
        <DialogueClientAdmin
          ouvert
          villes={villes}
          commerciaux={commerciaux}
          onFermer={() => setCreationOuverte(false)}
        />
      ) : null}

      {clientEdition ? (
        <DialogueClientAdmin
          ouvert
          villes={villes}
          commerciaux={commerciaux}
          client={clientEdition}
          onFermer={() => setClientEdition(null)}
        />
      ) : null}

      {creationExterneOuverte ? (
        <DialogueClientExterne
          ouvert
          villes={villes}
          onFermer={() => setCreationExterneOuverte(false)}
        />
      ) : null}

      {clientExterneEdition ? (
        <DialogueClientExterne
          ouvert
          villes={villes}
          client={clientExterneEdition}
          onFermer={() => setClientExterneEdition(null)}
        />
      ) : null}
    </div>
  );
}
