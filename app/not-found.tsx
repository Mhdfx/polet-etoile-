import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <section className="w-full max-w-md rounded-lg bg-card p-8 text-center shadow-sm ring-1 ring-border">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
          <SearchX aria-hidden="true" className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Erreur 404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Page introuvable
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La page demandée n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          Retour au tableau de bord
        </Link>
      </section>
    </main>
  );
}
