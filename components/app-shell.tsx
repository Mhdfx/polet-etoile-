import type { ComponentType, ReactNode } from "react";
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
  Users,
} from "lucide-react";
import { DeconnexionButton } from "@/components/deconnexion-button";
import type { UtilisateurSession } from "@/lib/session";

type NavigationItem = {
  label: string;
  active?: boolean;
  icon: ComponentType<{ className?: string }>;
};

const navigationAdmin: NavigationItem[] = [
  { label: "Accueil", icon: Home, active: true },
  { label: "Produits", icon: Package },
  { label: "Commandes", icon: ClipboardList },
  { label: "Paiements", icon: CreditCard },
  { label: "Clients", icon: Users },
  { label: "KPI", icon: BarChart3 },
  { label: "Audit", icon: FileText },
  { label: "Parametres", icon: Settings },
];

const navigationCommercial: NavigationItem[] = [
  { label: "Accueil", icon: Home, active: true },
  { label: "Nouvelle commande", icon: ShoppingCart },
  { label: "Mes clients", icon: Users },
  { label: "Retours", icon: RotateCcw },
  { label: "Mes KPI", icon: BarChart3 },
];

type AppShellProps = {
  utilisateur: UtilisateurSession;
  espace: "admin" | "commercial";
  titre: string;
  description: string;
  children: ReactNode;
};

export function AppShell({
  utilisateur,
  espace,
  titre,
  description,
  children,
}: AppShellProps) {
  const navigation =
    espace === "admin" ? navigationAdmin : navigationCommercial;

  return (
    <main className="bg-[#eef1f4] text-[#1f2937]">
      <section className="flex min-h-screen w-full bg-[#eef1f4]">
        <aside className="hidden w-[188px] shrink-0 flex-col bg-[#0f66d5] text-white md:flex md:min-h-full">
          <div className="flex h-20 items-center gap-3 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-white text-lg font-black text-[#0f66d5]">
              Y
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold">Your</p>
              <p className="text-sm font-bold">Company</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase text-white/65">
              Menu
            </p>
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex h-9 items-center gap-3 rounded-full px-3 text-left text-xs font-medium transition ${
                    item.active
                      ? "bg-white text-[#0f66d5]"
                      : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-white/15 p-4">
            <p className="text-[11px] uppercase text-white/60">Filtre</p>
            <div className="mt-3 rounded-md bg-[#0b58bd] p-3 text-xs">
              <p className="text-white/65">Annee</p>
              <p className="mt-1 font-semibold">2026</p>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-20 flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0f66d5]">
                {espace === "admin" ? "Dashboard admin" : "Dashboard commercial"}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-normal text-slate-900 sm:text-2xl">
                {titre}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right text-xs text-slate-500 sm:block">
                <p className="font-semibold text-slate-800">
                  Hello, {utilisateur.nom_complet}
                </p>
                <p>Aujourd&apos;hui</p>
              </div>
              <DeconnexionButton />
            </div>
          </header>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-5 py-3 md:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium ${
                    item.active
                      ? "bg-[#0f66d5] text-white"
                      : "bg-white text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
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
  className = "bg-white text-slate-900",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`rounded-lg p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
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

export function MetricCard({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: "blue" | "red" | "green";
}) {
  const toneClass = {
    blue: "bg-[#0f66d5]",
    red: "bg-[#f05d68]",
    green: "bg-[#2aa876]",
  }[tone];

  return (
    <article className={`${toneClass} rounded-lg p-4 text-white shadow-sm`}>
      <p className="text-xs font-medium text-white/75">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
    </article>
  );
}
