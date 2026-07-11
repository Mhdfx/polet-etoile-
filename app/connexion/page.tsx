import { redirect } from "next/navigation";
import { getUtilisateurSession, cheminAccueilPourRole } from "@/lib/session";
import { ConnexionForm } from "./connexion-form";

export default async function ConnexionPage() {
  const utilisateur = await getUtilisateurSession();

  if (utilisateur) {
    redirect(cheminAccueilPourRole(utilisateur.role));
  }

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5"
        />

        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-white text-xl font-black text-primary">
            P
          </div>
          <div className="leading-tight">
            <p className="text-base font-bold">Coq Plus</p>
            <p className="text-xs text-white/70">Gestion commerciale</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Pilotez vos ventes, vos clients et vos encaissements en un seul
            endroit.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Commandes terrain, bons de livraison séquentiels, paiements suivis
            au centime et indicateurs consolidés — la commande reste la source
            de vérité unique.
          </p>
        </div>

        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} Coq Plus
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-xl font-black text-primary-foreground">
              P
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-foreground">Coq Plus</p>
              <p className="text-xs text-muted-foreground">Gestion commerciale</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Connexion
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accès réservé aux administrateurs et aux commerciaux.
          </p>

          <ConnexionForm />
        </div>
      </section>
    </main>
  );
}
