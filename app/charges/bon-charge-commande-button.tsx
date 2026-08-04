"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Truck } from "lucide-react";
import { creerBonChargeDepuisCommande } from "@/app/charges/actions";
import { Bouton } from "@/components/bouton";
import { Button } from "@/components/ui/button";

type BonChargeLie = {
  id: string;
  numeroBc: string;
  supprime: boolean;
};

export function BonChargeCommandeButton({
  commandeId,
  bonCharge,
  compact = false,
}: {
  commandeId: string;
  bonCharge?: BonChargeLie | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string>();

  if (bonCharge && !bonCharge.supprime) {
    return (
      <Button variant="outline" size={compact ? "xs" : "sm"} asChild>
        <Link
          href={`/admin/charges/${bonCharge.id}`}
          aria-label={`Ouvrir le bon de charge ${bonCharge.numeroBc}`}
        >
          <Truck className="h-4 w-4" /> {compact ? "BC" : bonCharge.numeroBc}
        </Link>
      </Button>
    );
  }

  if (bonCharge?.supprime) {
    return (
      <Button variant="outline" size={compact ? "xs" : "sm"} disabled title="Bon de charge deja genere puis supprime">
        <Truck className="h-4 w-4" /> {compact ? "BC" : "BC supprime"}
      </Button>
    );
  }

  return (
    <div className="inline-grid justify-items-end gap-1">
      <Bouton
        type="button"
        size={compact ? "xs" : "sm"}
        variant="outline"
        chargement={enCours}
        aria-label="Créer le bon de charge de cette commande"
        onClick={async () => {
          if (enCours) return;
          setMessage(undefined);
          setEnCours(true);
          const resultat = await creerBonChargeDepuisCommande(commandeId);
          setEnCours(false);

          if (resultat.ok) {
            router.push(`/admin/charges/${resultat.bonChargeId}`);
            router.refresh();
            return;
          }

          setMessage(resultat.message ?? "Impossible de creer le bon de charge.");
          router.refresh();
        }}
      >
        <Truck className="h-4 w-4" /> {compact ? "BC" : "Bon de charge"}
      </Bouton>
      {message ? <p className="max-w-48 text-right text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
