"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PointGraphiqueMouvement = {
  jour: string;
  charge: number;
  vendu: number;
  retourne: number;
};

export function GraphiqueMouvementsProduits({
  donnees,
}: {
  donnees: PointGraphiqueMouvement[];
}) {
  if (donnees.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-lg bg-muted/35 text-sm text-muted-foreground">
        Aucun mouvement sur cette période.
      </div>
    );
  }

  return (
    <div className="h-72 w-full" role="img" aria-label="Évolution quotidienne des mouvements produits">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={donnees} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="jour" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={58} unit=" kg" />
          <Tooltip
            formatter={(valeur, nom) => [
              `${Number(valeur).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`,
              nom,
            ]}
          />
          <Legend />
          <Line type="monotone" dataKey="charge" name="Chargé" stroke="var(--primary)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="vendu" name="Vendu" stroke="var(--succes)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="retourne" name="Retourné" stroke="var(--alerte)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
