import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/db";
import { syncCatalogueCdc } from "@/lib/sync-catalogue";

function lireVersionApp(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main() {
  const mettreAJourPrix = process.env.SYNC_CDC_PRICES === "true";
  const usersAvant = await prisma.user.count();

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", actif: true, deleted_at: null },
    select: { id: true },
    orderBy: { created_at: "asc" },
  });

  const resultat = await syncCatalogueCdc(prisma, {
    mettreAJourPrix,
    versionApp: lireVersionApp(),
    utilisateurId: admin?.id ?? null,
  });

  const usersApres = await prisma.user.count();
  const produitsActifs = await prisma.produit.count({
    where: { actif: true, deleted_at: null },
  });

  console.log(
    JSON.stringify(
      {
        ...resultat,
        utilisateurs: { avant: usersAvant, apres: usersApres, preserves: usersAvant === usersApres },
        produitsActifs,
        note: mettreAJourPrix
          ? "Prix CDC appliques (SYNC_CDC_PRICES=true)"
          : "Prix existants conserves (defaut production)",
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
