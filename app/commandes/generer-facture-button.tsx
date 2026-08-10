"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText } from "lucide-react";
import { genererNumeroFactureCommande } from "@/app/commandes/actions";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
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
  const [ouvert, setOuvert] = useState(false);
  const [numeroSaisi, setNumeroSaisi] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string>();
  const [erreurNumero, setErreurNumero] = useState<string>();

  if (numeroFacture) {
    return (
      <Button size={compact ? "xs" : "sm"} variant="outline" asChild>
        <Link href={`/admin/commandes/${commandeId}/facture`} target="_blank" aria-label={`Ouvrir la facture ${numeroFacture}`}>
          <FileText /> {numeroFacture}
        </Link>
      </Button>
    );
  }

  const champId = `numero-facture-${commandeId}`;

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(prochainEtat) => {
        if (enCours) return;
        setOuvert(prochainEtat);
        if (!prochainEtat) {
          setMessage(undefined);
          setErreurNumero(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size={compact ? "xs" : "sm"} variant="outline">
          <FileText /> {compact ? "Creer facture" : "Generer la facture"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attribuer le numero de facture</DialogTitle>
          <DialogDescription>
            Saisissez le numero transmis par la comptabilite. Il sera conserve tel quel
            et ne pourra pas etre remplace depuis cet ecran.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (evenement) => {
            evenement.preventDefault();
            if (enCours) return;
            setMessage(undefined);
            setErreurNumero(undefined);
            setEnCours(true);
            const resultat = await genererNumeroFactureCommande({
              commandeId,
              numeroFacture: numeroSaisi,
            });
            setEnCours(false);
            if (resultat.ok) {
              setOuvert(false);
              setNumeroSaisi("");
              router.refresh();
              return;
            }
            setErreurNumero(resultat.erreurs?.numeroFacture);
            setMessage(resultat.message);
          }}
        >
          <Champ
            id={champId}
            label="Numero de facture"
            obligatoire
            erreur={erreurNumero}
            description="Exemple : FACT-2026-0042"
          >
            <Input
              id={champId}
              value={numeroSaisi}
              onChange={(evenement) => setNumeroSaisi(evenement.target.value)}
              placeholder="FACT-2026-0042"
              maxLength={40}
              autoComplete="off"
              aria-invalid={Boolean(erreurNumero)}
              aria-describedby={erreurNumero ? `${champId}-erreur` : `${champId}-description`}
              autoFocus
            />
          </Champ>
          {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
          <DialogFooter>
            <Bouton type="submit" chargement={enCours}>
              Enregistrer et generer
            </Bouton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
