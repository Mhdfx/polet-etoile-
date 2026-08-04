"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type TypeDocument = "bl" | "bon_charge";

function nomFichierDepuisReponse(reponse: Response, repli: string): string {
  const disposition = reponse.headers.get("content-disposition") ?? "";
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const simple = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const valeur = utf8 ?? simple;
  return valeur ? decodeURIComponent(valeur) : repli;
}

export function BoutonTelechargementCommercial({
  commandeId,
  typeDocument,
  libelle,
  indisponible,
  motifIndisponible,
  compact = false,
}: {
  commandeId: string;
  typeDocument: TypeDocument;
  libelle: string;
  indisponible?: boolean;
  motifIndisponible?: string;
  compact?: boolean;
}) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string>();

  async function telecharger() {
    if (chargement || indisponible) return;
    setChargement(true);
    setErreur(undefined);

    try {
      const donnees = new FormData();
      donnees.append("commandeIds", commandeId);
      donnees.append("documents", typeDocument);
      const reponse = await fetch("/commercial/commandes/documents", {
        method: "POST",
        body: donnees,
      });

      if (!reponse.ok) {
        throw new Error((await reponse.text()) || "Le document n'a pas pu etre genere.");
      }

      const blob = await reponse.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = nomFichierDepuisReponse(
        reponse,
        typeDocument === "bl" ? "bon-livraison.pdf" : "bon-charge.pdf",
      );
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
      // A full reload makes the server-side one-time state immediately visible.
      // It also prevents a second click while a stale React Server Component
      // payload is still being refreshed.
      window.setTimeout(() => window.location.reload(), 1_000);
    } catch (cause) {
      setErreur(
        cause instanceof Error
          ? cause.message
          : "Le document n'a pas pu etre genere. Reessayez.",
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <span className="inline-grid gap-1">
      <Button
        type="button"
        variant="outline"
        size={compact ? "xs" : "sm"}
        disabled={indisponible || chargement}
        aria-disabled={indisponible || chargement}
        title={motifIndisponible}
        onClick={telecharger}
      >
        <Download />
        {chargement ? "Preparation..." : libelle}
      </Button>
      {!compact && indisponible && motifIndisponible ? (
        <span className="max-w-64 text-xs text-muted-foreground">
          {motifIndisponible}
        </span>
      ) : null}
      {erreur ? (
        <span role="alert" className="max-w-64 text-xs text-destructive">
          {erreur}
        </span>
      ) : null}
    </span>
  );
}
