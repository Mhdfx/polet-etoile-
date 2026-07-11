"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampQuantite } from "@/components/champ-quantite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { creerBonCharge } from "@/app/charges/actions";

type Option = { id: string; nom: string };

type LigneSaisie = { cle: string; produitId: string; quantite: string };

function nouvelleLigne(): LigneSaisie {
  return { cle: crypto.randomUUID(), produitId: "", quantite: "" };
}

export function ChargeForm({
  commerciaux,
  produits,
}: {
  commerciaux: Option[];
  produits: Option[];
}) {
  const router = useRouter();
  const [commercialId, setCommercialId] = useState("");
  const [dateCharge, setDateCharge] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [lignes, setLignes] = useState<LigneSaisie[]>([nouvelleLigne()]);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [enCours, setEnCours] = useState(false);

  const produitsParId = useMemo(
    () => new Map(produits.map((produit) => [produit.id, produit.nom])),
    [produits],
  );

  function modifierLigne(cle: string, champ: "produitId" | "quantite", valeur: string) {
    setLignes((actuelles) =>
      actuelles.map((ligne) => (ligne.cle === cle ? { ...ligne, [champ]: valeur } : ligne)),
    );
  }

  function ajouterLigne() {
    setLignes((actuelles) => [...actuelles, nouvelleLigne()]);
  }

  function retirerLigne(cle: string) {
    setLignes((actuelles) =>
      actuelles.length > 1 ? actuelles.filter((ligne) => ligne.cle !== cle) : actuelles,
    );
  }

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (enCours) {
      return;
    }
    setErreurs({});
    setMessage(undefined);

    const lignesRemplies = lignes
      .filter((ligne) => ligne.produitId && ligne.quantite)
      .map((ligne) => ({ produitId: ligne.produitId, quantite: ligne.quantite }));

    if (lignesRemplies.length === 0) {
      setErreurs({ lignes: "Ajouter au moins un produit avec sa quantite." });
      return;
    }

    setEnCours(true);
    const resultat = await creerBonCharge({
      commercialId,
      dateCharge: dateCharge || undefined,
      commentaire: commentaire || undefined,
      lignes: lignesRemplies,
    });

    if (resultat.ok) {
      // On reste en chargement jusqu'a la navigation vers le detail (evite un
      // double envoi si l'utilisateur reclique pendant la redirection).
      router.push(`/admin/charges/${resultat.bonChargeId}`);
      router.refresh();
      return;
    }

    setEnCours(false);
    setErreurs(resultat.erreurs ?? {});
    setMessage(resultat.message);
  }

  return (
    <form
      onSubmit={soumettre}
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      noValidate
    >
      {message ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Champ id="charge-commercial" label="Commercial" obligatoire erreur={erreurs.commercialId}>
          <Select value={commercialId || undefined} onValueChange={setCommercialId}>
            <SelectTrigger id="charge-commercial" className="w-full">
              <SelectValue placeholder="Choisir un commercial" />
            </SelectTrigger>
            <SelectContent>
              {commerciaux.map((commercial) => (
                <SelectItem key={commercial.id} value={commercial.id}>
                  {commercial.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Champ>

        <Champ id="charge-date" label="Date de tournee" erreur={erreurs.dateCharge}>
          <Input
            id="charge-date"
            name="dateCharge"
            type="date"
            value={dateCharge}
            onChange={(evenement) => setDateCharge(evenement.target.value)}
          />
        </Champ>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Produits chargés</Label>
          <Button type="button" variant="outline" size="sm" onClick={ajouterLigne}>
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </Button>
        </div>
        {erreurs.lignes ? (
          <p role="alert" className="text-sm text-destructive">
            {erreurs.lignes}
          </p>
        ) : null}

        <div className="grid gap-2">
          {lignes.map((ligne) => (
            <div key={ligne.cle} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <Select
                  value={ligne.produitId || undefined}
                  onValueChange={(valeur) => modifierLigne(ligne.cle, "produitId", valeur)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Produit">
                      {ligne.produitId ? produitsParId.get(ligne.produitId) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {produits.map((produit) => (
                      <SelectItem key={produit.id} value={produit.id}>
                        {produit.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <ChampQuantite
                  aria-label="Quantité chargée"
                  value={ligne.quantite}
                  onChange={(evenement) =>
                    modifierLigne(ligne.cle, "quantite", evenement.target.value)
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retirer la ligne"
                onClick={() => retirerLigne(ligne.cle)}
                disabled={lignes.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Champ id="charge-commentaire" label="Commentaire" erreur={erreurs.commentaire}>
        <Textarea
          id="charge-commentaire"
          value={commentaire}
          onChange={(evenement) => setCommentaire(evenement.target.value)}
          placeholder="Véhicule, tournée, observation..."
        />
      </Champ>

      <div className="flex justify-end">
        <Bouton type="submit" chargement={enCours}>
          Enregistrer le bon de charge
        </Bouton>
      </div>

      <p className="text-xs text-muted-foreground">
        Le bon de charge est figé après création. Seul un administrateur peut le supprimer
        (soft delete tracé à l&apos;audit).
      </p>
    </form>
  );
}
