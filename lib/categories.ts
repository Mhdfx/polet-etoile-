import { prisma } from "@/lib/db";

export async function listerCategoriesProduits(): Promise<string[]> {
  const [parametre, categoriesProduits] = await Promise.all([
    prisma.parametreSysteme.findUnique({
      where: { cle: "categories_produits" },
      select: { valeur: true },
    }),
    prisma.produit.findMany({
      where: { deleted_at: null },
      select: { categorie: true },
      distinct: ["categorie"],
      orderBy: { categorie: "asc" },
    }),
  ]);

  let categoriesParam: string[] = [];
  try {
    const parsed = JSON.parse(parametre?.valeur ?? "[]");
    categoriesParam = Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];
  } catch {
    categoriesParam = [];
  }

  const fusion = new Set([
    ...categoriesParam.map((categorie) => categorie.trim()),
    ...categoriesProduits.map((produit) => produit.categorie.trim()),
  ]);

  return [...fusion].filter(Boolean);
}

