import { redirect } from "next/navigation";
import { getUtilisateurSession, cheminAccueilPourRole } from "@/lib/session";
import { ConnexionForm } from "./connexion-form";

export default async function ConnexionPage() {
  const utilisateur = await getUtilisateurSession();

  if (utilisateur) {
    redirect(cheminAccueilPourRole(utilisateur.role));
  }

  return (
    <main className="min-h-screen bg-[#f4f6f5] px-6 py-10 text-[#1f241f]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-md border border-[#cfd8d3] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-[#2f6f57]">
            Poulet Etoile
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Connexion</h1>
          <p className="mt-2 text-sm leading-6 text-[#596052]">
            Acces reserve aux administrateurs et commerciaux.
          </p>
          <ConnexionForm />
        </div>
      </section>
    </main>
  );
}
