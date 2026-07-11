"use client";

import { useState, useTransition, type FormEvent } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { creerUtilisateur, reinitialiserMotDePasse } from "./actions";

type ErreursChamps = Record<string, string>;

function BanniereErreur({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function DialogueNouvelUtilisateur({
  ouvert,
  onFermer,
  onSucces,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onSucces?: () => void;
}) {
  const [nomComplet, setNomComplet] = useState("");
  const [nomUtilisateur, setNomUtilisateur] = useState("");
  const [role, setRole] = useState("COMMERCIAL");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);

    startTransition(async () => {
      const resultat = await creerUtilisateur({
        nomComplet,
        nomUtilisateur,
        role,
        motDePasse,
        confirmation,
      });

      if (resultat.ok) {
        onSucces?.();
        onFermer();
        return;
      }

      setErreurs(resultat.erreurs ?? {});
      setMessageErreur(resultat.message);
    });
  }

  return (
    <Dialog open={ouvert} onOpenChange={(prochain) => (!prochain && !enCours ? onFermer() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            L&apos;utilisateur se connecte avec son nom d&apos;utilisateur et son
            mot de passe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={soumettre} className="grid gap-4" noValidate>
          <BanniereErreur message={messageErreur} />

          <Champ id="user-nom-complet" label="Nom complet" obligatoire erreur={erreurs.nomComplet}>
            <Input
              id="user-nom-complet"
              value={nomComplet}
              onChange={(evenement) => setNomComplet(evenement.target.value)}
              placeholder="Ex. Yassine Alaoui"
              aria-invalid={Boolean(erreurs.nomComplet)}
            />
          </Champ>

          <Champ
            id="user-nom-utilisateur"
            label="Nom d'utilisateur"
            obligatoire
            erreur={erreurs.nomUtilisateur}
            description="Minuscules, chiffres, point, tiret ou underscore (3 à 50 caractères)."
          >
            <Input
              id="user-nom-utilisateur"
              value={nomUtilisateur}
              onChange={(evenement) => setNomUtilisateur(evenement.target.value)}
              placeholder="Ex. commercial.centre"
              autoComplete="off"
              aria-invalid={Boolean(erreurs.nomUtilisateur)}
            />
          </Champ>

          <Champ id="user-role" label="Rôle" obligatoire erreur={erreurs.role}>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="user-role" aria-invalid={Boolean(erreurs.role)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                <SelectItem value="ADMIN">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </Champ>

          <Champ id="user-mdp" label="Mot de passe" obligatoire erreur={erreurs.motDePasse}>
            <Input
              id="user-mdp"
              type="password"
              value={motDePasse}
              onChange={(evenement) => setMotDePasse(evenement.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(erreurs.motDePasse)}
            />
          </Champ>

          <Champ
            id="user-confirmation"
            label="Confirmation du mot de passe"
            obligatoire
            erreur={erreurs.confirmation}
          >
            <Input
              id="user-confirmation"
              type="password"
              value={confirmation}
              onChange={(evenement) => setConfirmation(evenement.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(erreurs.confirmation)}
            />
          </Champ>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={enCours} onClick={onFermer}>
              Annuler
            </Button>
            <Bouton type="submit" chargement={enCours}>
              Créer l&apos;utilisateur
            </Bouton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogueMotDePasse({
  ouvert,
  onFermer,
  utilisateur,
}: {
  ouvert: boolean;
  onFermer: () => void;
  utilisateur: { id: string; nomComplet: string };
}) {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurs, setErreurs] = useState<ErreursChamps>({});
  const [messageErreur, setMessageErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreurs({});
    setMessageErreur(undefined);

    startTransition(async () => {
      const resultat = await reinitialiserMotDePasse({
        id: utilisateur.id,
        motDePasse,
        confirmation,
      });

      if (resultat.ok) {
        onFermer();
        return;
      }

      setErreurs(resultat.erreurs ?? {});
      setMessageErreur(resultat.message);
    });
  }

  return (
    <Dialog open={ouvert} onOpenChange={(prochain) => (!prochain && !enCours ? onFermer() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe — {utilisateur.nomComplet}</DialogTitle>
          <DialogDescription>
            Les sessions actives de cet utilisateur seront immédiatement
            déconnectées.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={soumettre} className="grid gap-4" noValidate>
          <BanniereErreur message={messageErreur} />

          <Champ id="mdp-nouveau" label="Nouveau mot de passe" obligatoire erreur={erreurs.motDePasse}>
            <Input
              id="mdp-nouveau"
              type="password"
              value={motDePasse}
              onChange={(evenement) => setMotDePasse(evenement.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(erreurs.motDePasse)}
            />
          </Champ>

          <Champ
            id="mdp-confirmation"
            label="Confirmation"
            obligatoire
            erreur={erreurs.confirmation}
          >
            <Input
              id="mdp-confirmation"
              type="password"
              value={confirmation}
              onChange={(evenement) => setConfirmation(evenement.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(erreurs.confirmation)}
            />
          </Champ>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={enCours} onClick={onFermer}>
              Annuler
            </Button>
            <Bouton type="submit" chargement={enCours}>
              Réinitialiser
            </Bouton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
