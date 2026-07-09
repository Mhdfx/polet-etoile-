"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { label: string; valeur: number };

const couleurs = ["#2563eb", "#16a34a", "#dc2626", "#64748b", "#7c3aed"];

function formaterTooltip(valeur: unknown) {
  const nombre = typeof valeur === "number" ? valeur : Number(valeur ?? 0);
  return `${nombre.toFixed(2)} DH`;
}

export function GraphiqueAireCA({ donnees }: { donnees: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={donnees}>
          <defs>
            <linearGradient id="ca-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={54} />
          <Tooltip formatter={formaterTooltip} />
          <Area type="monotone" dataKey="valeur" stroke="#2563eb" fill="url(#ca-gradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraphiqueDonutPaiement({ donnees }: { donnees: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={donnees} dataKey="valeur" nameKey="label" innerRadius={68} outerRadius={98}>
            {donnees.map((_, index) => (
              <Cell key={index} fill={couleurs[index % couleurs.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formaterTooltip} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraphiqueBarresCommerciaux({ donnees }: { donnees: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={donnees}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={54} />
          <Tooltip formatter={formaterTooltip} />
          <Bar dataKey="valeur" radius={[6, 6, 0, 0]} fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
