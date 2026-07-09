"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { supprimerCommandeAdmin } from "./actions";

export function SupprimerCommandeButton({ commandeId }: { commandeId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  return (
    <div className="grid gap-2">
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <DialogueConfirmation
        danger
        titre="Supprimer la commande ?"
        description="La commande et ses lignes seront masquees par suppression logique. Les traces d'audit restent conservees."
        libelleConfirmer="Supprimer"
        onConfirmer={async () => {
          const resultat = await supprimerCommandeAdmin(commandeId);
          if (!resultat.ok) {
            setMessage(resultat.message ?? "Suppression impossible.");
            return;
          }
          router.push("/admin/commandes");
          router.refresh();
        }}
      >
        <Button variant="destructive">Supprimer la commande</Button>
      </DialogueConfirmation>
    </div>
  );
}
