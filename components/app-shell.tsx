import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  Package,
  RotateCcw,
  Settings,
  ShoppingCart,
  Target,
  UserCog,
  Users,
} from "lucide-react";
import { DeconnexionButton } from "@/components/deconnexion-button";
import { cn } from "@/lib/utils";
import type { UtilisateurSession } from "@/lib/session";

type NavigationItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Absent tant que le module n'est pas construit : rendu inactif. */
  href?: string;
  /** Regroupement visuel dans la sidebar (admin). */
  groupe?: "menu" | "pilotage";
};

const navigationAdmin: NavigationItem[] = [
  { label: "Accueil", icon: Home, href: "/admin", groupe: "menu" },
  { label: "Produits", icon: Package, href: "/admin/produits", groupe: "menu" },
  { label: "Commandes", icon: ClipboardList, href: "/admin/commandes", groupe: "menu" },
  { label: "Paiements", icon: CreditCard, href: "/admin/paiements", groupe: "menu" },
  { label: "Clients", icon: Users, href: "/admin/clients", groupe: "menu" },
  { label: "Retours", icon: RotateCcw, href: "/admin/retours", groupe: "menu" },
  { label: "KPI", icon: BarChart3, href: "/admin/kpi", groupe: "pilotage" },
  {
    label: "Utilisateurs",
    icon: UserCog,
    href: "/admin/utilisateurs",
    groupe: "pilotage",
  },
  { label: "Objectifs", icon: Target, href: "/admin/objectifs", groupe: "pilotage" },
  { label: "Audit", icon: FileText, href: "/admin/audit", groupe: "pilotage" },
  { label: "Sessions", icon: Settings, href: "/admin/sessions", groupe: "pilotage" },
  { label: "Parametrage", icon: Settings, href: "/admin/parametres", groupe: "pilotage" },
  { label: "Exports", icon: FileText, href: "/admin/exports", groupe: "pilotage" },
];

const navigationCommercial: NavigationItem[] = [
  { label: "Accueil", icon: Home, href: "/commercial" },
  {
    label: "Nouvelle commande",
    icon: ShoppingCart,
    href: "/commercial/commandes/nouvelle",
  },
  { label: "Mes commandes", icon: ClipboardList, href: "/commercial/commandes" },
  { label: "Commandes externes", icon: FileText, href: "/commercial/commandes/externes" },
  { label: "Mes clients", icon: Users, href: "/commercial/clients" },
  { label: "Retours", icon: RotateCcw, href: "/commercial/retours" },
  { label: "Mes KPI", icon: BarChart3, href: "/commercial/kpi" },
];

/**
 * Une entree est active si le chemin courant est la page elle-meme ou une de
 * ses sous-pages. Les accueils (/admin, /commercial) matchent en exact pour ne
 * pas rester allumes partout. "Nouvelle commande" prime sur "Mes commandes".
 */
function estActif(item: NavigationItem, cheminActif: string, racine: string): boolean {
  if (!item.href) {
    return false;
  }
  if (item.href === racine) {
    return cheminActif === racine;
  }
  if (cheminActif === item.href) {
    return true;
  }
  if (!cheminActif.startsWith(`${item.href}/`)) {
    return false;
  }
  // Ne pas allumer un parent si un item plus specifique correspond deja.
  const navigation = racine === "/admin" ? navigationAdmin : navigationCommercial;
  return !navigation.some(
    (autre) =>
      autre.href &&
      autre.href !== item.href &&
      autre.href.startsWith(`${item.href}/`) &&
      (cheminActif === autre.href || cheminActif.startsWith(`${autre.href}/`)),
  );
}

type AppShellProps = {
  utilisateur: UtilisateurSession;
  espace: "admin" | "commercial";
  /** Chemin de la page courante, pour marquer l'entree active du menu. */
  cheminActif: string;
  titre: string;
  description: string;
  children: ReactNode;
};

export function AppShell({
  utilisateur,
  espace,
  cheminActif,
  titre,
  description,
  children,
}: AppShellProps) {
  const navigation =
    espace === "admin" ? navigationAdmin : navigationCommercial;
  const racine = espace === "admin" ? "/admin" : "/commercial";
  const groupes: Array<{ cle: NavigationItem["groupe"]; titre: string }> =
    espace === "admin"
      ? [
          { cle: "menu", titre: "Menu" },
          { cle: "pilotage", titre: "Pilotage" },
        ]
      : [{ cle: undefined, titre: "Menu" }];

  return (
    <main className="bg-background text-foreground">
      <a
        href="#contenu-principal"
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Aller au contenu principal
      </a>
      <section className="flex min-h-dvh w-full bg-background">
        <aside className="sticky top-0 hidden h-dvh w-[212px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-lg font-black text-sidebar-primary-foreground">
              P
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">Poulet Étoilé</p>
              <p className="text-[11px] text-sidebar-foreground/70">
                {espace === "admin" ? "Administration" : "Espace commercial"}
              </p>
            </div>
          </div>

          <nav
            aria-label="Navigation principale"
            className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4"
          >
            {groupes.map((groupe) => (
              <div key={groupe.titre} className="mt-3 first:mt-1">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">
                  {groupe.titre}
                </p>
                <div className="grid gap-0.5">
                  {navigation
                    .filter((item) => item.groupe === groupe.cle)
                    .map((item) => {
                      const Icon = item.icon;
                      const actif = estActif(item, cheminActif, racine);
                      const classes = cn(
                        "flex h-9 items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        actif
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/85 hover:bg-white/10 hover:text-sidebar-foreground",
                      );

                      if (!item.href) {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            disabled
                            title="Module à venir"
                            className={cn(classes, "cursor-not-allowed opacity-45")}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          aria-current={actif ? "page" : undefined}
                          className={classes}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-sidebar-border px-5 py-4 text-[11px] leading-relaxed text-sidebar-foreground/60">
            <p className="font-semibold text-sidebar-foreground/80">
              Gestion commerciale
            </p>
            <p>Poulet Étoilé — Naomedia</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 lg:px-7">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {espace === "admin" ? "Espace administrateur" : "Espace commercial"}
                </p>
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {titre}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden items-center gap-3 sm:flex">
                  <div className="text-right text-xs leading-tight">
                    <p className="font-semibold text-foreground">
                      {utilisateur.nom_complet}
                    </p>
                    <p className="text-muted-foreground">
                      {espace === "admin" ? "Administrateur" : "Commercial"}
                    </p>
                  </div>
                  <div
                    aria-hidden="true"
                    className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                  >
                    {utilisateur.nom_complet.slice(0, 1).toUpperCase()}
                  </div>
                </div>
                <DeconnexionButton />
              </div>
            </div>

            <nav
              aria-label="Navigation mobile"
              className="flex gap-1.5 overflow-x-auto px-5 pb-3 md:hidden"
            >
              {navigation.map((item) => {
                const Icon = item.icon;
                const actif = estActif(item, cheminActif, racine);
                const classes = cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                  actif
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                );

                if (!item.href) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled
                      title="Module à venir"
                      className={cn(classes, "cursor-not-allowed opacity-50")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={actif ? "page" : undefined}
                    className={classes}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div id="contenu-principal" className="mx-auto w-full max-w-[1440px] p-4 sm:p-5 lg:p-7">
            {description ? (
              <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
            {children}
          </div>
        </section>
      </section>
    </main>
  );
}

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className = "bg-card text-card-foreground",
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-lg p-4 shadow-sm ring-1 ring-border", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-sm font-semibold text-inherit">{title}</h2>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </article>
  );
}
