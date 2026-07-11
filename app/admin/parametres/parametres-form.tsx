"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [valeursForm, setValeursForm] = useState(valeurs);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [succes, setSucces] = useState(false);
  const [erreursLogo, setErreursLogo] = useState<Record<string, string>>({});
  const [messageLogo, setMessageLogo] = useState<string>();
  const [succesLogo, setSuccesLogo] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);

  useEffect(() => {
    setValeursForm(valeurs);
  }, [valeurs]);

  function modifierChamp(champ: keyof typeof valeursForm) {
    return (evenement: ChangeEvent<HTMLInputElement>) => {
      setValeursForm((actuelles) => ({
        ...actuelles,
        [champ]: evenement.target.value,
      }));
    };
  }

  function soumettreParametres(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setMessage(undefined);
    setSucces(false);
    setErreurs({});
    const formData = new FormData(evenement.currentTarget);
    const entree = {
      ...valeursForm,
      ...Object.fromEntries(formData.entries()),
    };

    setIsPending(true);
    void (async () => {
      const resultat = await modifierParametresSysteme(entree);
      setIsPending(false);
      if (!resultat.ok) {
        setErreurs(resultat.erreurs ?? {});
        setMessage(resultat.message);
        return;
      }
      setValeursForm((actuelles) => ({ ...actuelles, ...entree }));
      setSucces(true);
      router.refresh();
    })();
  }

  return (
    <div className="grid gap-5">
    <form
      className="grid gap-5"
      onSubmit={soumettreParametres}
    >
      <section className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold">Identite societe</h2>
        <Champ id="raisonSociale" label="Raison sociale" erreur={erreurs.raisonSociale} obligatoire>
          <Input
            id="raisonSociale"
            name="raisonSociale"
            value={valeursForm.raisonSociale}
            onChange={modifierChamp("raisonSociale")}
          />
        </Champ>
        <Champ id="telephone" label="Telephone" erreur={erreurs.telephone}>
          <Input
            id="telephone"
            name="telephone"
            value={valeursForm.telephone}
            onChange={modifierChamp("telephone")}
          />
        </Champ>
        <Champ id="ice" label="ICE" erreur={erreurs.ice}>
          <Input id="ice" name="ice" value={valeursForm.ice} onChange={modifierChamp("ice")} />
        </Champ>
        <Champ id="rc" label="RC" erreur={erreurs.rc}>
          <Input id="rc" name="rc" value={valeursForm.rc} onChange={modifierChamp("rc")} />
        </Champ>
        <Champ id="identifiantFiscal" label="Identifiant fiscal" erreur={erreurs.identifiantFiscal}>
          <Input
            id="identifiantFiscal"
            name="identifiantFiscal"
            value={valeursForm.identifiantFiscal}
            onChange={modifierChamp("identifiantFiscal")}
          />
        </Champ>
        <Champ id="patente" label="Patente" erreur={erreurs.patente}>
          <Input
            id="patente"
            name="patente"
            value={valeursForm.patente}
            onChange={modifierChamp("patente")}
          />
        </Champ>
        <Champ id="adresse" label="Adresse" erreur={erreurs.adresse} className="md:col-span-2">
          <Input
            id="adresse"
            name="adresse"
            value={valeursForm.adresse}
            onChange={modifierChamp("adresse")}
          />
        </Champ>
        <Champ
          id="logoUrl"
          label="Logo"
          erreur={erreurs.logoUrl}
          description="Chemin genere automatiquement par l'upload securise ci-dessous."
          className="md:col-span-2"
        >
          <Input id="logoUrl" name="logoUrl" value={valeursForm.logoUrl} readOnly />
        </Champ>
      </section>

      <section className="grid gap-4 rounded-lg bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-3">
        <h2 className="md:col-span-3 text-sm font-semibold">Regles systeme</h2>
        <Champ id="tauxTva" label="Taux TVA (%)" erreur={erreurs.tauxTva}>
          <Input
            id="tauxTva"
            name="tauxTva"
            value={valeursForm.tauxTva}
            onChange={modifierChamp("tauxTva")}
            inputMode="decimal"
          />
        </Champ>
        <Champ id="prefixeBl" label="Prefixe BL" erreur={erreurs.prefixeBl}>
          <Input
            id="prefixeBl"
            name="prefixeBl"
            value={valeursForm.prefixeBl}
            onChange={modifierChamp("prefixeBl")}
          />
        </Champ>
        <Champ id="fuseauHoraire" label="Fuseau horaire" erreur={erreurs.fuseauHoraire}>
          <Input
            id="fuseauHoraire"
            name="fuseauHoraire"
            value={valeursForm.fuseauHoraire}
            onChange={modifierChamp("fuseauHoraire")}
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
        setUploadPending(true);
        void (async () => {
          const resultat = await televerserLogoSociete(formData);
          setUploadPending(false);
          if (!resultat.ok) {
            setErreursLogo(resultat.erreurs ?? {});
            setMessageLogo(resultat.message);
            return;
          }
          setSuccesLogo(true);
          router.refresh();
        })();
      }}
    >
      <h2 className="text-sm font-semibold">Upload logo</h2>
      <Champ
        id="logo"
        label="Fichier logo"
        erreur={erreursLogo.logo}
        description="Formats acceptes : PNG ou JPG valide. Taille maximum : 2 Mo."
      >
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg" />
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
