"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export function ConnexionForm() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setChargement(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    const resultat = await signIn.username({
      username,
      password,
      rememberMe: true,
    });

    setChargement(false);

    if (resultat.error) {
      // CDC §5.1 : ne jamais indiquer lequel des deux champs est errone.
      setErreur("Nom d'utilisateur ou mot de passe incorrect.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
      <Champ id="username" label="Nom d'utilisateur" obligatoire>
        <Input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoFocus
          disabled={chargement}
          className="h-10"
          placeholder="votre.identifiant"
        />
      </Champ>

      <Champ id="password" label="Mot de passe" obligatoire>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={motDePasseVisible ? "text" : "password"}
            required
            minLength={8}
            autoComplete="current-password"
            disabled={chargement}
            className="h-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setMotDePasseVisible((visible) => !visible)}
            aria-label={
              motDePasseVisible
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
            className="absolute inset-y-0 right-0 grid w-10 cursor-pointer place-items-center text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-primary"
          >
            {motDePasseVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </Champ>

      {erreur ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {erreur}
        </p>
      ) : null}

      <Bouton type="submit" size="lg" chargement={chargement} className="h-10 w-full">
        Se connecter
      </Bouton>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-succes" />
        Connexion chiffrée et protégée
      </p>
    </form>
  );
}
