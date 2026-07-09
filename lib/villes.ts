import { prisma } from "@/lib/db";

export const VILLES_MAROC_DEFAUT = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fes",
  "Tanger",
  "Agadir",
  "Meknes",
  "Oujda",
  "Kenitra",
  "Tetouan",
  "Safi",
  "Mohammedia",
  "El Jadida",
  "Beni Mellal",
  "Nador",
];

function parserListeVilles(valeur?: string | null): string[] {
  if (!valeur) {
    return VILLES_MAROC_DEFAUT;
  }

  try {
    const parsed = JSON.parse(valeur);
    if (!Array.isArray(parsed)) {
      return VILLES_MAROC_DEFAUT;
    }

    const villes = parsed
      .filter((ville): ville is string => typeof ville === "string")
      .map((ville) => ville.trim())
      .filter(Boolean);

    return villes.length > 0 ? villes : VILLES_MAROC_DEFAUT;
  } catch {
    return VILLES_MAROC_DEFAUT;
  }
}

export async function listerVillesMaroc(): Promise<string[]> {
  const parametre = await prisma.parametreSysteme.findUnique({
    where: { cle: "villes_maroc" },
    select: { valeur: true },
  });

  return parserListeVilles(parametre?.valeur);
}
