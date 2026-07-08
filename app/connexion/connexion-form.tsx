"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export function ConnexionForm() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

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
      setErreur("Nom d'utilisateur ou mot de passe incorrect.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="username">
          Nom d&apos;utilisateur
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="rounded-md border border-[#cfd8d3] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f6f57] focus:ring-2 focus:ring-[#2f6f57]/20"
          placeholder="admin"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="rounded-md border border-[#cfd8d3] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f6f57] focus:ring-2 focus:ring-[#2f6f57]/20"
        />
      </div>

      {erreur ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erreur}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={chargement}
        className="rounded-md bg-[#2f6f57] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#285e4b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {chargement ? "Connexion..." : "Se connecter"}
      </button>

      <div className="rounded-md bg-[#f4f6f5] p-3 text-xs leading-5 text-[#596052]">
        <p>Admin seed : admin / password</p>
        <p>Commercial seed : commercial.nord / commercial123</p>
      </div>
    </form>
  );
}
