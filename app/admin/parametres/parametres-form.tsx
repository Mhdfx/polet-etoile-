"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { Input } from "@/components/ui/input";
import { modifierParametresSysteme, televerserLogoSociete } from "./actions";

type ParametresFormProps = {
  valeurs: {
    raisonSociale: string;
    ice: string;
    rc: string;
    identifiantFiscal: string;
    patente: string;
    adresse: string;
    telephone: string;
    logoUrl: string;
    tauxTva: string;
    prefixeBl: string;
    fuseauHoraire: string;
  };
};

export function ParametresForm({ valeurs }: ParametresFormProps) {
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [succes, setSucces] = useState(false);
  const [erreursLogo, setErreursLogo] = useState<Record<string, string>>({});
  const [messageLogo, setMessageLogo] = useState<string>();
  const [succesLogo, setSuccesLogo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploadPending, startUploadTransition] = useTransition();

  return (
    <div className="grid gap-5">
    <form
      className="grid gap-5"
      action={(formData) => {
        setMessage(undefined);
        setSucces(false);
        setErreurs({});

        const entree = Object.fromEntries(formData.entries());
        startTransition(async () => {
          const resultat = await modifierParametresSysteme(entree);
          if (!resultat.ok) {
            setErreurs(resultat.erreurs ?? {});
            setMessage(resultat.message);
            return;
          }
          setSucces(true);
        });
      }}
    >
      <section className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold">Identite societe</h2>
        <Champ id="raisonSociale" label="Raison sociale" erreur={erreurs.raisonSociale} obligatoire>
          <Input id="raisonSociale" name="raisonSociale" defaultValue={valeurs.raisonSociale} />
        </Champ>
        <Champ id="telephone" label="Telephone" erreur={erreurs.telephone}>
          <Input id="telephone" name="telephone" defaultValue={valeurs.telephone} />
        </Champ>
        <Champ id="ice" label="ICE" erreur={erreurs.ice}>
          <Input id="ice" name="ice" defaultValue={valeurs.ice} />
        </Champ>
        <Champ id="rc" label="RC" erreur={erreurs.rc}>
          <Input id="rc" name="rc" defaultValue={valeurs.rc} />
        </Champ>
        <Champ id="identifiantFiscal" label="Identifiant fiscal" erreur={erreurs.identifiantFiscal}>
          <Input
            id="identifiantFiscal"
            name="identifiantFiscal"
            defaultValue={valeurs.identifiantFiscal}
          />
        </Champ>
        <Champ id="patente" label="Patente" erreur={erreurs.patente}>
          <Input id="patente" name="patente" defaultValue={valeurs.patente} />
        </Champ>
        <Champ id="adresse" label="Adresse" erreur={erreurs.adresse} className="md:col-span-2">
          <Input id="adresse" name="adresse" defaultValue={valeurs.adresse} />
        </Champ>
        <Champ
          id="logoUrl"
          label="Logo"
          erreur={erreurs.logoUrl}
          description="Chemin public, ex. /uploads/logos/logo.png, alimente par l'upload ci-dessous."
          className="md:col-span-2"
        >
          <Input id="logoUrl" name="logoUrl" defaultValue={valeurs.logoUrl} />
        </Champ>
      </section>

      <section className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-3">
        <h2 className="md:col-span-3 text-sm font-semibold">Regles systeme</h2>
        <Champ id="tauxTva" label="Taux TVA (%)" erreur={erreurs.tauxTva}>
          <Input id="tauxTva" name="tauxTva" defaultValue={valeurs.tauxTva} inputMode="decimal" />
        </Champ>
        <Champ id="prefixeBl" label="Prefixe BL" erreur={erreurs.prefixeBl}>
          <Input id="prefixeBl" name="prefixeBl" defaultValue={valeurs.prefixeBl} />
        </Champ>
        <Champ id="fuseauHoraire" label="Fuseau horaire" erreur={erreurs.fuseauHoraire}>
          <Input
            id="fuseauHoraire"
            name="fuseauHoraire"
            defaultValue={valeurs.fuseauHoraire}
          />
        </Champ>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Bouton type="submit" chargement={isPending}>
          <Save />
          Enregistrer
        </Bouton>
        {succes ? <p className="text-sm text-emerald-700">Parametres enregistres.</p> : null}
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
      </div>
    </form>
    <form
      className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border"
      action={(formData) => {
        setErreursLogo({});
        setMessageLogo(undefined);
        setSuccesLogo(false);
        startUploadTransition(async () => {
          const resultat = await televerserLogoSociete(formData);
          if (!resultat.ok) {
            setErreursLogo(resultat.erreurs ?? {});
            setMessageLogo(resultat.message);
            return;
          }
          setSuccesLogo(true);
        });
      }}
    >
      <h2 className="text-sm font-semibold">Upload logo</h2>
      <Champ
        id="logo"
        label="Fichier logo"
        erreur={erreursLogo.logo}
        description="Formats acceptes : PNG, JPG, SVG. Taille maximum : 2 Mo. PNG ou JPG recommande : un logo SVG n'apparait pas dans le PDF du bon de livraison."
      >
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml" />
      </Champ>
      <div className="flex flex-wrap items-center gap-3">
        <Bouton type="submit" chargement={uploadPending}>
          Televerser le logo
        </Bouton>
        {succesLogo ? <p className="text-sm text-emerald-700">Logo televerse.</p> : null}
        {messageLogo ? <p className="text-sm text-destructive">{messageLogo}</p> : null}
      </div>
    </form>
    </div>
  );
}
