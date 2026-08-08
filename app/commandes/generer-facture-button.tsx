"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText } from "lucide-react";
import { genererNumeroFactureCommande } from "@/app/commandes/actions";
import { Bouton } from "@/components/bouton";
import { Button } from "@/components/ui/button";

export function GenererFactureButton({
  commandeId,
  numeroFacture,
  compact = false,
}: {
  commandeId: string;
  numeroFacture?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string>();

  if (numeroFacture) {
    return (
      <Button size={compact ? "xs" : "sm"} variant="outline" asChild>
        <Link href={`/admin/commandes/${commandeId}/facture`} target="_blank" aria-label={`Ouvrir la facture ${numeroFacture}`}>
          <FileText /> {numeroFacture}
        </Link>
      </Button>
    );
  }

  return (
    <div className="inline-grid gap-1">
      <Bouton
        type="button"
        size={compact ? "xs" : "sm"}
        variant="outline"
        chargement={enCours}
        onClick={async () => {
          if (enCours) return;
          setMessage(undefined);
          setEnCours(true);
          const resultat = await genererNumeroFactureCommande(commandeId);
          setEnCours(false);
          if (resultat.ok) {
            router.refresh();
            return;
          }
          setMessage(resultat.message);
        }}
      >
        <FileText /> {compact ? "Creer facture" : "Generer la facture"}
      </Bouton>
      {message ? <p role="alert" className="max-w-52 text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
