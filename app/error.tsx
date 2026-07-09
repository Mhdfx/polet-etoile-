"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <section className="w-full max-w-md rounded-lg bg-card p-8 text-center shadow-sm ring-1 ring-border">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10">
          <TriangleAlert aria-hidden="true" className="h-6 w-6 text-destructive" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Erreur 500
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Une erreur est survenue
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Veuillez réessayer. Si le problème persiste, contactez votre
          administrateur. Les détails techniques restent journalisés côté
          serveur.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Identifiant d&apos;erreur :{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              {error.digest}
            </code>
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
