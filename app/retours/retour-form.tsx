"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampQuantite } from "@/components/champ-quantite";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { creerRetour } from "./actions";

type ProduitRetour = {
  id: string;
  nom: string;
};

export function RetourForm({ produits }: { produits: ProduitRetour[] }) {
  const [produitId, setProduitId] = useState("");
  const [quantiteKg, setQuantiteKg] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [succes, setSucces] = useState<string>();
  const [enCours, setEnCours] = useState(false);
  const router = useRouter();

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (enCours) {
      return;
    }
    setErreurs({});
    setMessage(undefined);
    setSucces(undefined);
    setEnCours(true);

    const resultat = await creerRetour({ produitId, quantiteKg, commentaire });

    setEnCours(false);

    if (resultat.ok) {
      setProduitId("");
      setQuantiteKg("");
      setCommentaire("");
      setSucces("Retour enregistre.");
      // L'historique sous le formulaire vit dans le Server Component parent.
      // Un reload court garantit que la ligne creee est visible immediatement
      // meme si le cache RSC local ne se reconcilie pas assez vite.
      router.refresh();
      window.setTimeout(() => window.location.reload(), 100);
      return;
    }

    setErreurs(resultat.erreurs ?? {});
    setMessage(resultat.message);
  }

  return (
    <form onSubmit={soumettre} className="grid gap-4 rounded-lg border border-border bg-card p-4" noValidate>
      {message ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {succes ? (
        <p className="rounded-md bg-succes/10 px-3 py-2 text-sm text-succes">
          {succes}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Champ id="retour-produit" label="Produit" obligatoire erreur={erreurs.produitId}>
          <Select value={produitId} onValueChange={setProduitId}>
            <SelectTrigger id="retour-produit" className="w-full">
              <SelectValue placeholder="Choisir un produit" />
            </SelectTrigger>
            <SelectContent>
              {produits.map((produit) => (
                <SelectItem key={produit.id} value={produit.id}>
                  {produit.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Champ>

        <Champ
          id="retour-quantite"
          label="Quantite retour"
          obligatoire
          erreur={erreurs.quantiteKg}
        >
          <ChampQuantite
            id="retour-quantite"
            value={quantiteKg}
            onChange={(evenement) => setQuantiteKg(evenement.target.value)}
            aria-invalid={Boolean(erreurs.quantiteKg)}
          />
        </Champ>
      </div>

      <Champ id="retour-commentaire" label="Commentaire" erreur={erreurs.commentaire}>
        <Textarea
          id="retour-commentaire"
          value={commentaire}
          onChange={(evenement) => setCommentaire(evenement.target.value)}
          placeholder="Motif, magasin, observation..."
          aria-invalid={Boolean(erreurs.commentaire)}
        />
      </Champ>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={enCours}
          onClick={() => {
            setProduitId("");
            setQuantiteKg("");
            setCommentaire("");
          }}
        >
          Effacer
        </Button>
        <Bouton type="submit" chargement={enCours}>
          Enregistrer le retour
        </Bouton>
      </div>

      {/* Note explicite CDC 5.6 : horodatage et utilisateur jamais saisis manuellement. */}
      <p className="text-xs text-muted-foreground">
        Le retour est horodaté automatiquement et lié à votre compte.
      </p>
    </form>
  );
}
