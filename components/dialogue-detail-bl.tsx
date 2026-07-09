"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LigneDetailBl = {
  produit: string;
  quantite: string;
  prixUnitaire: string;
  prixNet: string;
};

/**
 * Popup CDC 6.6 : clic sur un numero de BL depuis une fiche client ouvre le
 * detail des lignes produits de cette commande precise, sans quitter la page.
 * Toutes les valeurs arrivent deja formatees (chaines) depuis le serveur.
 */
export function DialogueDetailBl({
  numeroBl,
  date,
  statut,
  total,
  lignes,
  lienDetail,
}: {
  numeroBl: string;
  date: string;
  statut: string;
  total: string;
  lignes: LigneDetailBl[];
  lienDetail?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className="font-medium text-primary hover:underline">
        {numeroBl}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>BL {numeroBl}</DialogTitle>
          <DialogDescription>
            {date} · Statut : {statut}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantite</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Prix net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((ligne, index) => (
                <TableRow key={`${ligne.produit}-${index}`}>
                  <TableCell>{ligne.produit}</TableCell>
                  <TableCell className="text-right tabular-nums">{ligne.quantite}</TableCell>
                  <TableCell className="text-right tabular-nums">{ligne.prixUnitaire}</TableCell>
                  <TableCell className="text-right tabular-nums">{ligne.prixNet}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold">Total : {total}</p>
          {lienDetail ? (
            <Link className="text-primary hover:underline" href={lienDetail}>
              Ouvrir le detail complet
            </Link>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
