import { AppShell, MetricCard, Panel } from "@/components/app-shell";
import { requireCommercial } from "@/lib/session";

const commandes = [
  { client: "Boucherie Atlas", montant: "4 524 DH", statut: "Payee" },
  { client: "Restaurant Sud", montant: "2 240 DH", statut: "En attente" },
  { client: "Traiteur Externe", montant: "1 050 DH", statut: "En attente" },
];

const progression = [
  ["Objectif", "60 000 DH", "72%"],
  ["Encaisse", "43 200 DH", "72%"],
  ["Reste", "16 800 DH", "28%"],
];

export default async function CommercialPage() {
  const utilisateur = await requireCommercial();

  return (
    <AppShell
      utilisateur={utilisateur}
      espace="commercial"
      titre="Selling Dashboard"
      description="Espace terrain pour suivre les commandes, clients et objectifs."
    >
      <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard label="Commandes du jour" value="12" tone="blue" />
            <MetricCard label="Retours saisis" value="3" tone="red" />
          </div>

          <Panel title="Profil commercial" eyebrow="Session">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0f66d5] text-xl font-bold text-white">
                {utilisateur.nom_complet.slice(0, 1)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {utilisateur.nom_complet}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {utilisateur.nom_utilisateur}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Objectif mensuel">
            <div className="space-y-4">
              {progression.map(([label, value, ratio]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[#0f66d5]" style={{ width: ratio }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4">
          <Panel title="Actions rapides" eyebrow="Terrain">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Nouvelle commande",
                "Ajouter client",
                "Saisir retour",
                "Voir mes KPI",
              ].map((action) => (
                <button
                  key={action}
                  type="button"
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition hover:border-[#0f66d5] hover:bg-[#eff6ff]"
                >
                  {action}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Commandes recentes" eyebrow="Month to Date">
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Client</th>
                    <th className="px-3 py-3 font-semibold">Montant</th>
                    <th className="px-3 py-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {commandes.map((commande) => (
                    <tr key={commande.client}>
                      <td className="px-3 py-3 font-medium text-slate-800">
                        {commande.client}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{commande.montant}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            commande.statut === "Payee"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {commande.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Carte de couverture">
            <div className="relative h-64 overflow-hidden rounded-md bg-[#e8eef3]">
              <div className="absolute left-[14%] top-[28%] h-16 w-16 rounded-full bg-[#f05d68]/75" />
              <div className="absolute left-[34%] top-[48%] h-12 w-12 rounded-full bg-[#0f66d5]/55" />
              <div className="absolute left-[58%] top-[22%] h-20 w-20 rounded-full bg-[#f05d68]/60" />
              <div className="absolute left-[72%] top-[58%] h-14 w-14 rounded-full bg-[#0f66d5]/60" />
              <div className="absolute inset-x-6 top-1/2 h-px bg-white" />
              <div className="absolute inset-y-6 left-1/2 w-px bg-white" />
              <p className="absolute bottom-4 left-4 text-sm font-semibold text-slate-600">
                Zones commerciales a connecter aux donnees reelles.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
