import { AppShell, Panel } from "@/components/app-shell";
import { CarteKPI } from "@/components/carte-kpi";
import { requireAdmin } from "@/lib/session";

const ventes = [
  { label: "Lun", value: 46 },
  { label: "Mar", value: 72 },
  { label: "Mer", value: 58 },
  { label: "Jeu", value: 86 },
  { label: "Ven", value: 64 },
  { label: "Sam", value: 92 },
];

const modules = [
  { nom: "Produits et prix", etat: "A construire" },
  { nom: "Commandes", etat: "A construire" },
  { nom: "Paiements", etat: "A construire" },
  { nom: "Utilisateurs", etat: "A construire" },
];

const soldes = [
  { label: "Cash", value: "537 848,20 DH", ratio: "72%" },
  { label: "Cheques", value: "8 955,00 DH", ratio: "28%" },
  { label: "Total", value: "546 803,20 DH", ratio: "100%" },
];

export default async function AdminPage() {
  const utilisateur = await requireAdmin();

  return (
    <AppShell
      utilisateur={utilisateur}
      espace="admin"
      cheminActif="/admin"
      titre="Summary Dashboard"
      description="Vue pilote pour les ventes, encaissements et modules admin."
    >
      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <CarteKPI label="Ventes du mois" valeur="28" tonalite="rouge" />
            <CarteKPI label="Clients actifs" valeur="146" tonalite="bleu" />
            <CarteKPI label="Reste du" valeur="18K" tonalite="vert" />
          </div>

          <Panel title="Ventes par jour" eyebrow="Month to Date">
            <div className="flex h-52 items-end gap-4 border-b border-slate-100 px-2">
              {ventes.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-[#8ab6f4]"
                    style={{ height: `${item.value}%` }}
                  />
                  <span className="text-xs text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Modules admin" eyebrow="Roadmap">
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((module) => (
                <div
                  key={module.nom}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {module.nom}
                  </span>
                  <span className="rounded-full bg-[#f05d68]/10 px-3 py-1 text-xs font-semibold text-[#f05d68]">
                    {module.etat}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4">
          <Panel title="AR & Cash Balance" className="bg-[#0f66d5] text-white">
            <div className="space-y-4">
              {soldes.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-white/75">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20">
                    <div
                      className="h-2 rounded-full bg-[#ffcf55]"
                      style={{ width: item.ratio }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Production & Supply Chain" className="bg-[#f05d68] text-white">
            <div className="grid gap-3 text-sm">
              {["Poulet entier", "Cuisse", "Blanc", "Aile"].map((label, index) => (
                <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="text-white/80">{label}</span>
                  <span className="font-semibold">{[345, 270, 198, 120][index]} kg</span>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-md bg-white/15 p-3 text-sm font-semibold">
              Out of Stock : 696 SKU of 1,500
            </p>
          </Panel>

          <Panel title="Canal de distribution">
            <div className="space-y-3">
              {[
                ["Boucheries", "82%"],
                ["Restaurants", "68%"],
                ["Traiteurs", "54%"],
                ["Externes", "34%"],
              ].map(([label, ratio]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{label}</span>
                    <span>{ratio}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[#0f66d5]" style={{ width: ratio }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
