"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { supprimerBonCharge } from "@/app/charges/actions";

export function SupprimerBonChargeBouton({
  bonChargeId,
  numeroBc,
}: {
  bonChargeId: string;
  numeroBc: string;
}) {
  const router = useRouter();

  return (
    <DialogueConfirmation
      titre={`Supprimer le bon de charge ${numeroBc} ?`}
      description="Le bon de charge et ses lignes seront désactivés (soft delete) et l'action tracée à l'audit. Il disparaîtra du rapprochement."
      libelleConfirmer="Supprimer"
      danger
      onConfirmer={async () => {
        const resultat = await supprimerBonCharge(bonChargeId);
        if (resultat.ok) {
          router.push("/admin/charges");
          router.refresh();
        }
      }}
    >
      <Button variant="destructive" size="sm">
        <Trash2 className="h-4 w-4" /> Supprimer
      </Button>
    </DialogueConfirmation>
  );
}
