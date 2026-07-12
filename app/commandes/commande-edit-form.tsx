"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { ChampQuantite } from "@/components/champ-quantite";
import { Button } from "@/components/ui/button";
import { SelectNatif } from "@/components/ui/select-natif";
import { calculerPrixNet, sommerMontants } from "@/lib/decimal";
import { formatMontant } from "@/lib/format";
import { normaliserSaisieQuantite } from "@/lib/saisie";
import { modifierCommandeAdmin } from "./actions";

type OptionProduit = {
  id: string;
  nom: string;
  prixReference: string;
  prixReferenceLabel: string;
};

type OptionClient = {
  id: string;
  nom: string;
  ville: string;
  commercialId?: string;
};

type OptionResponsable = {
  id: string;
  nom: string;
};

type LigneFormulaire = {
  produitId: string;
  quantite: string;
};

type CommandeInitiale = {
  id: string;
  numeroBl: string;
  dateCommande: string;
  commercialId: string;
  typeClient: "STANDARD" | "EXTERNE";
  clientId?: string;
  clientExterneId?: string;
  lignes: LigneFormulaire[];
};

function nouvelleLigne(): LigneFormulaire {
  return { produitId: "", quantite: "" };
}

export function CommandeEditForm({
  commande,
  produits,
  clients,
  clientsExternes,
  responsables,
}: {
  commande: CommandeInitiale;
  produits: OptionProduit[];
  clients: Array<OptionClient & { commercialId: string }>;
  clientsExternes: OptionClient[];
  responsables: OptionResponsable[];
}) {
  const [dateCommande, setDateCommande] = useState(commande.dateCommande);
  const [commercialId, setCommercialId] = useState(commande.commercialId);
  const [typeClient, setTypeClient] = useState<"STANDARD" | "EXTERNE">(
    commande.typeClient,
  );
  const [clientId, setClientId] = useState(commande.clientId ?? "");
  const [clientExterneId, setClientExterneId] = useState(
    commande.clientExterneId ?? "",
  );
  const [lignes, setLignes] = useState<LigneFormulaire[]>(
    commande.lignes.length > 0 ? commande.lignes : [nouvelleLigne()],
  );
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [enCours, setEnCours] = useState(false);

  const produitsParId = useMemo(
    () => new Map(produits.map((produit) => [produit.id, produit])),
    [produits],
  );
  const clientsDisponibles = clients.filter(
    (client) => client.commercialId === commercialId,
  );

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

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (enCours) {
      return;
    }

    setMessage(undefined);
    setErreurs({});
    setEnCours(true);

    const resultat = await modifierCommandeAdmin({
      commandeId: commande.id,
      dateCommande,
      commercialId,
      typeClient,
      clientId: typeClient === "STANDARD" ? clientId : undefined,
      clientExterneId: typeClient === "EXTERNE" ? clientExterneId : undefined,
      lignes: lignes.filter((ligne) => ligne.produitId || ligne.quantite),
    });

    setEnCours(false);

    if (!resultat.ok) {
      setErreurs(resultat.erreurs ?? {});
      setMessage(resultat.message ?? "Modification impossible.");
      return;
    }

    setMessage("Commande modifiee. Redirection...");
    window.location.assign(`/admin/commandes/${commande.id}`);
  }

  return (
    <form onSubmit={soumettre} className="grid gap-5" noValidate>
      {message ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
        <Champ id="commande-date" label="Date BL" obligatoire erreur={erreurs.dateCommande}>
          <input
            id="commande-date"
            type="date"
            value={dateCommande}
            onChange={(event) => setDateCommande(event.target.value)}
            onInput={(event) => setDateCommande(event.currentTarget.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </Champ>

        <Champ id="commande-commercial" label="Responsable" obligatoire erreur={erreurs.commercialId}>
          <SelectNatif
            id="commande-commercial"
            value={commercialId}
            onChange={(event) => {
              setCommercialId(event.target.value);
              setClientId("");
            }}
          >
            {responsables.map((responsable) => (
              <option key={responsable.id} value={responsable.id}>
                {responsable.nom}
              </option>
            ))}
          </SelectNatif>
        </Champ>

        <Champ id="commande-type-client" label="Type de client" obligatoire>
          <SelectNatif
            id="commande-type-client"
            value={typeClient}
            onChange={(event) => {
              const valeur = event.target.value as "STANDARD" | "EXTERNE";
              setTypeClient(valeur);
              setClientId("");
              setClientExterneId("");
            }}
          >
            <option value="STANDARD">Client standard</option>
            <option value="EXTERNE">Client externe</option>
          </SelectNatif>
        </Champ>

        {typeClient === "STANDARD" ? (
          <Champ id="commande-client" label="Client" obligatoire erreur={erreurs.clientId}>
            <SelectNatif
              id="commande-client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">Choisir un client</option>
              {clientsDisponibles.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom} - {client.ville}
                </option>
              ))}
            </SelectNatif>
          </Champ>
        ) : (
          <Champ
            id="commande-client-externe"
            label="Client externe"
            obligatoire
            erreur={erreurs.clientExterneId}
          >
            <SelectNatif
              id="commande-client-externe"
              value={clientExterneId}
              onChange={(event) => setClientExterneId(event.target.value)}
            >
              <option value="">Choisir un client externe</option>
              {clientsExternes.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom} - {client.ville}
                </option>
              ))}
            </SelectNatif>
          </Champ>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Lignes du BL</h2>
            <p className="text-xs text-muted-foreground">
              Les prix sont recalcules depuis le catalogue actif au moment de la modification.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLignes((actuelles) => [...actuelles, nouvelleLigne()])}
          >
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </Button>
        </div>

        {erreurs.lignes ? <p className="text-sm text-destructive">{erreurs.lignes}</p> : null}

        {lignes.map((ligne, index) => {
          const produit = produitsParId.get(ligne.produitId);
          const quantite = normaliserSaisieQuantite(ligne.quantite);
          const prixNet =
            produit && quantite
              ? formatMontant(calculerPrixNet(quantite, produit.prixReference))
              : "-";

          return (
            <div
              key={`${index}-${ligne.produitId}`}
              className="grid gap-3 rounded-lg border border-border bg-background/50 p-3 md:grid-cols-[1fr_150px_130px_44px]"
            >
              <Champ id={`ligne-produit-${index}`} label="Produit" obligatoire>
                <SelectNatif
                  id={`ligne-produit-${index}`}
                  value={ligne.produitId}
                  onChange={(event) =>
                    modifierLigne(index, { produitId: event.target.value })
                  }
                >
                  <option value="">Choisir un produit</option>
                  {produits.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nom} - {option.prixReferenceLabel}
                    </option>
                  ))}
                </SelectNatif>
              </Champ>

              <Champ id={`ligne-quantite-${index}`} label="Quantite" obligatoire>
                <ChampQuantite
                  id={`ligne-quantite-${index}`}
                  value={ligne.quantite}
                  onChange={(event) => modifierLigne(index, { quantite: event.target.value })}
                />
              </Champ>

              <div className="grid content-end gap-1">
                <p className="text-xs font-medium text-muted-foreground">Net</p>
                <p className="h-10 rounded-md border border-border px-2.5 py-2 text-right text-sm tabular-nums">
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
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex justify-end text-sm">
          Total apercu{" "}
          <span className="ml-2 text-lg font-semibold tabular-nums">{totalApercu}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Bouton type="submit" chargement={enCours}>
          Enregistrer les modifications
        </Bouton>
      </div>
    </form>
  );
}
