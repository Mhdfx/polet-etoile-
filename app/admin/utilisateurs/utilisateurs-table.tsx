"use client";

import { useCallback, useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Plus, Power, Search, Target, Trash2 } from "lucide-react";
import { BadgeStatut } from "@/components/badge-statut";
import { Bouton } from "@/components/bouton";
import { DataTable } from "@/components/data-table";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResultatAction } from "@/lib/validations/commun";
import { definirActivationUtilisateur, supprimerUtilisateur } from "./actions";
import {
  DialogueMotDePasse,
  DialogueNouvelUtilisateur,
} from "./utilisateurs-dialogs";

export type LigneUtilisateur = {
  id: string;
  nomComplet: string;
  nomUtilisateur: string;
  role: "ADMIN" | "COMMERCIAL";
  actif: boolean;
  derniereConnexion: string;
};

type UtilisateursTableProps = {
  lignes: LigneUtilisateur[];
  page: number;
  taillePage: number;
  totalLignes: number;
  recherche: string;
  idAdminConnecte: string;
};

export function UtilisateursTable({
  lignes,
  page,
  taillePage,
  totalLignes,
  recherche,
  idAdminConnecte,
}: UtilisateursTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [enChargement, startTransition] = useTransition();
  const [saisieRecherche, setSaisieRecherche] = useState(recherche);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [utilisateurMdp, setUtilisateurMdp] = useState<LigneUtilisateur | null>(null);
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

  const executerAction = useCallback(async (action: () => Promise<ResultatAction>) => {
    const resultat = await action();
    if (!resultat.ok) {
      setMessageEchec(resultat.message ?? "L'action a échoué. Réessayez.");
      return;
    }
    router.refresh();
  }, [router]);

  const rafraichirApresMutation = useCallback(() => {
    router.refresh();
    window.setTimeout(() => window.location.reload(), 100);
  }, [router]);

  const colonnes = useMemo<ColumnDef<LigneUtilisateur, unknown>[]>(
    () => [
      {
        accessorKey: "nomComplet",
        header: "Utilisateur",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.nomComplet}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.nomUtilisateur}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Rôle",
        cell: ({ row }) =>
          row.original.role === "ADMIN" ? (
            <Badge>Administrateur</Badge>
          ) : (
            <Badge variant="outline">Commercial</Badge>
          ),
      },
      {
        accessorKey: "actif",
        header: "Statut",
        cell: ({ row }) => (
          <BadgeStatut statut={row.original.actif ? "actif" : "inactif"} />
        ),
      },
      { accessorKey: "derniereConnexion", header: "Dernière connexion" },
      {
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => {
          const utilisateur = row.original;
          const estSoiMeme = utilisateur.id === idAdminConnecte;

          return (
            <div className="flex justify-end gap-1">
              {utilisateur.role === "COMMERCIAL" ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Objectifs mensuels"
                  asChild
                >
                  <Link href={`/admin/utilisateurs/${utilisateur.id}/objectifs`}>
                    <Target />
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                title="Réinitialiser le mot de passe"
                onClick={() => setUtilisateurMdp(utilisateur)}
              >
                <KeyRound />
              </Button>
              <DialogueConfirmation
                titre={
                  utilisateur.actif
                    ? "Désactiver l'utilisateur ?"
                    : "Activer l'utilisateur ?"
                }
                description={
                  utilisateur.actif
                    ? `${utilisateur.nomComplet} ne pourra plus se connecter ; ses sessions actives seront fermées immédiatement.`
                    : `${utilisateur.nomComplet} pourra de nouveau se connecter.`
                }
                libelleConfirmer={utilisateur.actif ? "Désactiver" : "Activer"}
                onConfirmer={() =>
                  executerAction(() =>
                    definirActivationUtilisateur(utilisateur.id, !utilisateur.actif),
                  )
                }
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={
                    estSoiMeme
                      ? "Impossible sur votre propre compte"
                      : utilisateur.actif
                        ? "Désactiver"
                        : "Activer"
                  }
                  disabled={estSoiMeme}
                >
                  <Power />
                </Button>
              </DialogueConfirmation>
              <DialogueConfirmation
                danger
                titre="Supprimer l'utilisateur ?"
                description={`${utilisateur.nomComplet} sera retiré des listes (suppression logique, tracée dans l'audit). Ses commandes et son historique restent consultables.`}
                libelleConfirmer="Supprimer"
                onConfirmer={() =>
                  executerAction(() => supprimerUtilisateur(utilisateur.id))
                }
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={
                    estSoiMeme
                      ? "Impossible sur votre propre compte"
                      : "Supprimer"
                  }
                  disabled={estSoiMeme}
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
    [executerAction, idAdminConnecte],
  );

  const messageVide = recherche
    ? `Aucun utilisateur ne correspond à « ${recherche} ».`
    : "Aucun utilisateur.";

  return (
    <div className="grid gap-4">
      {messageEchec ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{messageEchec}</span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => setMessageEchec(undefined)}
          >
            Fermer
          </button>
        </div>
      ) : null}

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
              placeholder="Rechercher un utilisateur…"
              className="w-full pl-8 sm:w-64"
              aria-label="Rechercher un utilisateur"
            />
          </div>
          <Bouton type="submit" variant="outline" chargement={enChargement}>
            Rechercher
          </Bouton>
        </form>

        <Button onClick={() => setCreationOuverte(true)}>
          <Plus />
          Nouvel utilisateur
        </Button>
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
        <DialogueNouvelUtilisateur
          ouvert
          onFermer={() => setCreationOuverte(false)}
          onSucces={rafraichirApresMutation}
        />
      ) : null}

      {utilisateurMdp ? (
        <DialogueMotDePasse
          ouvert
          utilisateur={{ id: utilisateurMdp.id, nomComplet: utilisateurMdp.nomComplet }}
          onFermer={() => setUtilisateurMdp(null)}
        />
      ) : null}
    </div>
  );
}
