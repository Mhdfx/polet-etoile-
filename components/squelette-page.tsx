import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette generique de page (cartes KPI + tableau) affiche par les
 * `loading.tsx` de segment pendant le rendu serveur (CDC §10.2 : jamais
 * d'ecran fige sans indication de chargement).
 */
export function SquelettePage() {
  return (
    <main className="flex min-h-dvh bg-background" aria-busy="true">
      <div className="hidden w-[212px] shrink-0 bg-sidebar md:block" />
      <div className="flex-1">
        <div className="border-b border-border bg-background px-5 py-4 lg:px-7">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-6 w-64" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] space-y-4 p-4 sm:p-5 lg:p-7">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg bg-card p-4 shadow-sm ring-1 ring-border"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-card p-4 shadow-sm ring-1 ring-border">
            <Skeleton className="h-4 w-48" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
