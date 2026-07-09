"use client";

import { useState } from "react";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { supprimerSession } from "./actions";

export function SupprimerSessionButton({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState<string>();

  return (
    <div className="grid gap-1">
      <DialogueConfirmation
        danger
        titre="Fermer la session ?"
        description="La session sera supprimee immediatement en base."
        libelleConfirmer="Fermer"
        onConfirmer={async () => {
          const resultat = await supprimerSession(sessionId);
          if (!resultat.ok) {
            setMessage(resultat.message ?? "Suppression impossible.");
          }
        }}
      >
        <Button variant="ghost" size="sm" className="text-destructive">
          Fermer
        </Button>
      </DialogueConfirmation>
      {message ? <p className="text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
