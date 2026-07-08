"use client";

import { useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { z } from "zod";
import { BadgeStatut } from "@/components/badge-statut";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampMontant } from "@/components/champ-montant";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normaliserSaisieMontant } from "@/lib/saisie";

type LigneProduit = {
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

const colonnes: ColumnDef<LigneProduit, unknown>[] = [
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
];

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

  const messageVide = recherche
    ? `Aucun produit ne correspond à « ${recherche} ».`
    : "Aucun produit dans le catalogue.";

  return (
    <div className="grid gap-4">
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

        <DialogueNouveauProduit categories={categories} />
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
    </div>
  );
}

const schemaNouveauProduit = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères"),
  categorie: z.string().min(1, "La catégorie est obligatoire"),
  prix: z
    .string()
    .refine(
      (valeur) => {
        const normalise = normaliserSaisieMontant(valeur);
        return normalise !== null && Number.parseFloat(normalise) > 0;
      },
      { message: "Le prix doit être un montant supérieur à 0 (ex. 45,50)" },
    ),
});

type ErreursFormulaire = Partial<Record<"nom" | "categorie" | "prix", string>>;

function DialogueNouveauProduit({ categories }: { categories: string[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [prix, setPrix] = useState("");
  const [erreurs, setErreurs] = useState<ErreursFormulaire>({});
  const [valide, setValide] = useState(false);

  function reinitialiser() {
    setNom("");
    setCategorie("");
    setPrix("");
    setErreurs({});
    setValide(false);
  }

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const resultat = schemaNouveauProduit.safeParse({ nom, categorie, prix });

    if (!resultat.success) {
      const prochainesErreurs: ErreursFormulaire = {};
      for (const probleme of resultat.error.issues) {
        const champ = probleme.path[0] as keyof ErreursFormulaire;
        prochainesErreurs[champ] ??= probleme.message;
      }
      setErreurs(prochainesErreurs);
      setValide(false);
      return;
    }

    setErreurs({});
    setValide(true);
  }

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(prochain) => {
        setOuvert(prochain);
        if (!prochain) {
          reinitialiser();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nouveau produit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
          <DialogDescription>
            Formulaire de référence du design system. L&apos;enregistrement réel
            sera activé avec le module Produits (Phase 4).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={soumettre} className="grid gap-4" noValidate>
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
          >
            <Select value={categorie} onValueChange={setCategorie}>
              <SelectTrigger
                id="produit-categorie"
                aria-invalid={Boolean(erreurs.categorie)}
              >
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Champ>

          <Champ
            id="produit-prix"
            label="Prix de référence"
            obligatoire
            erreur={erreurs.prix}
            description="Quantités en kg — montant HT en dirhams."
          >
            <ChampMontant
              id="produit-prix"
              value={prix}
              onChange={(evenement) => setPrix(evenement.target.value)}
              aria-invalid={Boolean(erreurs.prix)}
            />
          </Champ>

          {valide ? (
            <p
              role="status"
              className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
            >
              Saisie valide. La création réelle sera activée avec le module
              Produits (Phase 4), après gel du schéma.
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOuvert(false)}
            >
              Annuler
            </Button>
            <Bouton type="submit">Valider la saisie</Bouton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
