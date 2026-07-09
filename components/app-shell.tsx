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
};

const navigationAdmin: NavigationItem[] = [
  { label: "Accueil", icon: Home, href: "/admin" },
  { label: "Produits", icon: Package, href: "/admin/produits" },
  { label: "Commandes", icon: ClipboardList, href: "/admin/commandes" },
  { label: "Paiements", icon: CreditCard },
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Utilisateurs", icon: UserCog, href: "/admin/utilisateurs" },
  { label: "KPI", icon: BarChart3, href: "/admin/kpi" },
  { label: "Retours", icon: RotateCcw, href: "/admin/retours" },
  { label: "Audit", icon: FileText, href: "/admin/audit" },
  { label: "Sessions", icon: Settings, href: "/admin/sessions" },
];

const navigationCommercial: NavigationItem[] = [
  { label: "Accueil", icon: Home, href: "/commercial" },
  {
    label: "Nouvelle commande",
    icon: ShoppingCart,
    href: "/commercial/commandes/nouvelle",
  },
  { label: "Mes commandes", icon: ClipboardList, href: "/commercial/commandes" },
  { label: "Mes clients", icon: Users, href: "/commercial/clients" },
  { label: "Retours", icon: RotateCcw, href: "/commercial/retours" },
  { label: "Mes KPI", icon: BarChart3, href: "/commercial/kpi" },
];

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

  return (
    <main className="bg-background text-foreground">
      <section className="flex min-h-screen w-full bg-background">
        <aside className="hidden w-[188px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex md:min-h-full">
          <div className="flex h-20 items-center gap-3 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-sidebar-primary text-lg font-black text-sidebar-primary-foreground">
              P
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold">Poulet</p>
              <p className="text-sm font-bold">Étoilé</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase text-sidebar-foreground/65">
              Menu
            </p>
            {navigation.map((item) => {
              const Icon = item.icon;
              const actif = item.href === cheminActif;
              const classes = cn(
                "flex h-9 items-center gap-3 rounded-full px-3 text-left text-xs font-medium transition",
                actif
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-foreground/10",
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
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <Link key={item.label} href={item.href} className={classes}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <p className="text-[11px] uppercase text-sidebar-foreground/60">Filtre</p>
            <div className="mt-3 rounded-md bg-sidebar-accent p-3 text-xs text-sidebar-accent-foreground">
              <p className="opacity-65">Annee</p>
              <p className="mt-1 font-semibold">2026</p>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-20 flex-col gap-4 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {espace === "admin" ? "Dashboard admin" : "Dashboard commercial"}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-normal text-foreground sm:text-2xl">
                {titre}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                <p className="font-semibold text-foreground">
                  Hello, {utilisateur.nom_complet}
                </p>
                <p>Aujourd&apos;hui</p>
              </div>
              <DeconnexionButton />
            </div>
          </header>

          <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-3 md:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const actif = item.href === cheminActif;
              const classes = cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium",
                actif
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground",
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
                <Link key={item.label} href={item.href} className={classes}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="overflow-visible p-4 sm:p-5 lg:p-7">{children}</div>
        </section>
      </section>
    </main>
  );
}

export function Panel({
  title,
  eyebrow,
  children,
  className = "bg-card text-card-foreground",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-lg p-4 shadow-sm ring-1 ring-border", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase opacity-70">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-sm font-semibold text-inherit">{title}</h2>
        </div>
      </div>
      {children}
    </article>
  );
}
