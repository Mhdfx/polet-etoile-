"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DialogueConfirmationProps = {
  /** Element declencheur (bouton, item de menu…). */
  children: ReactNode;
  titre: string;
  description: string;
  libelleConfirmer?: string;
  libelleAnnuler?: string;
  danger?: boolean;
  /** Action executee a la confirmation ; le dialogue reste ouvert et bloque pendant l'execution. */
  onConfirmer: () => void | Promise<void>;
};

export function DialogueConfirmation({
  children,
  titre,
  description,
  libelleConfirmer = "Confirmer",
  libelleAnnuler = "Annuler",
  danger = false,
  onConfirmer,
}: DialogueConfirmationProps) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, startTransition] = useTransition();

  function confirmer() {
    startTransition(async () => {
      await onConfirmer();
      setOuvert(false);
    });
  }

  return (
    <AlertDialog
      open={ouvert}
      onOpenChange={(prochain) => {
        if (!enCours) {
          setOuvert(prochain);
        }
      }}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titre}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enCours}>{libelleAnnuler}</AlertDialogCancel>
          <Button
            variant={danger ? "destructive" : "default"}
            disabled={enCours}
            aria-busy={enCours}
            onClick={confirmer}
          >
            {enCours ? <Loader2 className="animate-spin" /> : null}
            {libelleConfirmer}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
