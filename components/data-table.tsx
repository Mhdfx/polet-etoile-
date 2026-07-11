"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DataTableCommunProps<TDonnee> = {
  colonnes: ColumnDef<TDonnee, unknown>[];
  donnees: TDonnee[];
  chargement?: boolean;
  /** Message d'etat vide explicite, jamais un tableau vide silencieux. */
  messageVide: string;
};

type DataTableAvecPagination = {
  pagination?: true;
  page: number;
  taillePage: number;
  totalLignes: number;
  onPageChange: (page: number) => void;
};

type DataTableSansPagination = {
  pagination: false;
};

type DataTableProps<TDonnee> = DataTableCommunProps<TDonnee> &
  (DataTableAvecPagination | DataTableSansPagination);

export function DataTable<TDonnee>(props: DataTableProps<TDonnee>) {
  const { colonnes, donnees, chargement = false, messageVide } = props;
  const paginationActive = props.pagination !== false;
  const page = paginationActive ? props.page : 1;
  const taillePage = paginationActive ? props.taillePage : Math.max(1, donnees.length);
  const totalLignes = paginationActive ? props.totalLignes : donnees.length;
  const table = useReactTable({
    data: donnees,
    columns: colonnes,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: paginationActive,
    rowCount: totalLignes,
  });

  const pagesTotal = Math.max(1, Math.ceil(totalLignes / taillePage));
  const lignesEntete = table.getHeaderGroups();

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            {lignesEntete.map((groupe) => (
              <TableRow key={groupe.id}>
                {groupe.headers.map((entete) => (
                  <TableHead key={entete.id}>
                    {entete.isPlaceholder
                      ? null
                      : flexRender(
                          entete.column.columnDef.header,
                          entete.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {chargement ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`squelette-${index}`}>
                  {colonnes.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colonnes.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {messageVide}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((ligne) => (
                <TableRow key={ligne.id}>
                  {ligne.getVisibleCells().map((cellule) => (
                    <TableCell key={cellule.id}>
                      {flexRender(
                        cellule.column.columnDef.cell,
                        cellule.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {paginationActive ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            {totalLignes === 0
              ? "Aucun résultat"
              : `${totalLignes} résultat${totalLignes > 1 ? "s" : ""} — page ${page} sur ${pagesTotal}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={chargement || page <= 1}
              onClick={() => props.onPageChange(page - 1)}
            >
              <ChevronLeft />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={chargement || page >= pagesTotal}
              onClick={() => props.onPageChange(page + 1)}
            >
              Suivant
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {totalLignes === 0
            ? "Aucun résultat"
            : `${totalLignes} produit${totalLignes > 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}
