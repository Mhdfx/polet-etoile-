"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampQuantite } from "@/components/champ-quantite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculerPrixNet, sommerMontants } from "@/lib/decimal";
import { formatMontant } from "@/lib/format";
import { normaliserSaisieQuantite } from "@/lib/saisie";
import { creerCommandeAdmin, creerCommandeCommercial } from "./actions";

type OptionProduit = {
  id: string;
  nom: string;
  categorie: string;
  prixReference: string;
  prixReferenceLabel: string;
};

type OptionClient = {
  id: string;
  nom: string;
  ville: string;
  commercialId?: string;
};

type OptionCommercial = {
  id: string;
  nom: string;
};

type LigneFormulaire = {
  produitId: string;
  quantite: string;
};

type CommandeFormProps =
  | {
      mode: "commercial";
      produits: OptionProduit[];
      clients: OptionClient[];
    }
  | {
      mode: "admin";
      produits: OptionProduit[];
      clients: Array<OptionClient & { commercialId: string }>;
      clientsExternes: OptionClient[];
      commerciaux: OptionCommercial[];
    };

function nouvelleLigne(): LigneFormulaire {
  return { produitId: "", quantite: "" };
}

export function CommandeForm(props: CommandeFormProps) {
  const [clientId, setClientId] = useState("");
  const [clientExterneId, setClientExterneId] = useState("");
  const [commercialId, setCommercialId] = useState(
    props.mode === "admin" ? (props.commerciaux[0]?.id ?? "") : "",
  );
  const [typeClient, setTypeClient] = useState<"STANDARD" | "EXTERNE">("STANDARD");
  const [lignes, setLignes] = useState<LigneFormulaire[]>([nouvelleLigne()]);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [succes, setSucces] = useState<string>();
  const [enCours, startTransition] = useTransition();

  const produitsParId = useMemo(
    () => new Map(props.produits.map((produit) => [produit.id, produit])),
    [props.produits],
  );

  const clientsDisponibles =
    props.mode === "admin"
      ? props.clients.filter((client) => client.commercialId === commercialId)
      : props.clients;

  const totalApercu = useMemo(() => {
    const montants = lignes
      .map((ligne) => {
        const produit = produitsParId.get(ligne.produitId);
        const quantite = normaliserSaisieQuantite(ligne.quantite);
        if (!produit || !quantite) {
          return null;
        }

        return calculerPrixNet(quantite, produit.prixReference);
      })
      .filter((montant): montant is NonNullable<typeof montant> => montant !== null);

    return montants.length > 0 ? formatMontant(sommerMontants(montants)) : "0,00 DH";
  }, [lignes, produitsParId]);

  function modifierLigne(index: number, patch: Partial<LigneFormulaire>) {
    setLignes((actuelles) =>
      actuelles.map((ligne, ligneIndex) =>
        ligneIndex === index ? { ...ligne, ...patch } : ligne,
      ),
    );
  }

  function supprimerLigne(index: number) {
    setLignes((actuelles) =>
      actuelles.length === 1
        ? [nouvelleLigne()]
        : actuelles.filter((_, ligneIndex) => ligneIndex !== index),
    );
  }

  function reinitialiserApresSucces() {
    setClientId("");
    setClientExterneId("");
    setTypeClient("STANDARD");
    setLignes([nouvelleLigne()]);
    setErreurs({});
  }

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setMessage(undefined);
    setSucces(undefined);
    setErreurs({});

    const lignesValides = lignes.filter((ligne) => ligne.produitId || ligne.quantite);

    startTransition(async () => {
      const resultat =
        props.mode === "admin"
          ? await creerCommandeAdmin({
              commercialId,
              typeClient,
              clientId: typeClient === "STANDARD" ? clientId : undefined,
              clientExterneId:
                typeClient === "EXTERNE" ? clientExterneId : undefined,
              lignes: lignesValides,
            })
          : await creerCommandeCommercial({
              clientId,
              lignes: lignesValides,
            });

      if (resultat.ok) {
        setSucces(`Commande creee : ${resultat.numeroBl}`);
        reinitialiserApresSucces();
        return;
      }

      setErreurs(resultat.erreurs ?? {});
      setMessage(resultat.message ?? "La commande n'a pas pu etre creee.");
    });
  }

  return (
    <form onSubmit={soumettre} className="grid gap-5" noValidate>
      {message ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {message}
        </p>
      ) : null}

      {succes ? (
        <p
          role="status"
          className="rounded-md bg-succes/10 px-3 py-2 text-sm font-medium text-succes"
        >
          {succes}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
          <CardDescription>
            Selectionner le client avant d&apos;ajouter les produits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {props.mode === "admin" ? (
            <>
              <Champ
                id="commande-commercial"
                label="Commercial"
                obligatoire
                erreur={erreurs.commercialId}
              >
                <Select
                  value={commercialId || undefined}
                  onValueChange={(valeur) => {
                    setCommercialId(valeur);
                    setClientId("");
                  }}
                >
                  <SelectTrigger id="commande-commercial" className="w-full">
                    <SelectValue placeholder="Choisir un commercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.commerciaux.map((commercial) => (
                      <SelectItem key={commercial.id} value={commercial.id}>
                        {commercial.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Champ>

              <Champ id="commande-type-client" label="Type de client" obligatoire>
                <Select
                  value={typeClient}
                  onValueChange={(valeur: "STANDARD" | "EXTERNE") => {
                    setTypeClient(valeur);
                    setClientId("");
                    setClientExterneId("");
                  }}
                >
                  <SelectTrigger id="commande-type-client" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Client standard</SelectItem>
                    <SelectItem value="EXTERNE">Client externe</SelectItem>
                  </SelectContent>
                </Select>
              </Champ>
            </>
          ) : null}

          {typeClient === "STANDARD" ? (
            <Champ id="commande-client" label="Client" obligatoire erreur={erreurs.clientId}>
              <Select value={clientId || undefined} onValueChange={setClientId}>
                <SelectTrigger id="commande-client" className="w-full">
                  <SelectValue placeholder="Choisir un client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsDisponibles.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom} - {client.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
          ) : null}

          {props.mode === "admin" && typeClient === "EXTERNE" ? (
            <Champ
              id="commande-client-externe"
              label="Client externe"
              obligatoire
              erreur={erreurs.clientExterneId}
            >
              <Select
                value={clientExterneId || undefined}
                onValueChange={setClientExterneId}
              >
                <SelectTrigger id="commande-client-externe" className="w-full">
                  <SelectValue placeholder="Choisir un client externe" />
                </SelectTrigger>
                <SelectContent>
                  {props.clientsExternes.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom} - {client.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lignes de commande</CardTitle>
          <CardDescription>
            Le prix est repris depuis le catalogue actif et fige a la creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {erreurs.lignes ? (
            <p className="text-sm text-destructive">{erreurs.lignes}</p>
          ) : null}

          {lignes.map((ligne, index) => {
            const produit = produitsParId.get(ligne.produitId);
            const quantite = normaliserSaisieQuantite(ligne.quantite);
            const prixNet =
              produit && quantite
                ? formatMontant(calculerPrixNet(quantite, produit.prixReference))
                : "-";

            return (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-border bg-background/50 p-3 md:grid-cols-[1fr_150px_130px_44px]"
              >
                <Champ id={`ligne-produit-${index}`} label="Produit" obligatoire>
                  <Select
                    value={ligne.produitId || undefined}
                    onValueChange={(produitId) => modifierLigne(index, { produitId })}
                  >
                    <SelectTrigger id={`ligne-produit-${index}`} className="w-full">
                      <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.produits.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.nom} - {option.prixReferenceLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Champ>

                <Champ id={`ligne-quantite-${index}`} label="Quantite" obligatoire>
                  <ChampQuantite
                    id={`ligne-quantite-${index}`}
                    value={ligne.quantite}
                    onChange={(evenement) =>
                      modifierLigne(index, { quantite: evenement.target.value })
                    }
                  />
                </Champ>

                <div className="grid content-end gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Net</p>
                  <p className="h-8 rounded-lg border border-border px-2.5 py-2 text-right text-sm tabular-nums">
                    {prixNet}
                  </p>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Retirer la ligne"
                    onClick={() => supprimerLigne(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLignes((actuelles) => [...actuelles, nouvelleLigne()])}
            >
              <Plus />
              Ajouter une ligne
            </Button>

            <p className="text-right text-sm">
              Total apercu{" "}
              <span className="ml-2 text-lg font-semibold tabular-nums">
                {totalApercu}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Bouton type="submit" chargement={enCours}>
          Creer la commande
        </Bouton>
      </div>
    </form>
  );
}
