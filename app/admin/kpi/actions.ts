"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  CLE_PARAMETRE_EPINGLES,
  estCleEpinglable,
  lireEpinglesKpi,
} from "@/lib/kpi-epingles";
import { requireAdmin } from "@/lib/session";

/**
 * CDC 6.5.3 : epingle / retire une carte KPI du tableau de bord admin.
 * Preference d'affichage globale, stockee dans parametres_systeme.
 */
export async function basculerEpingleKpi(cle: unknown): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();

  if (typeof cle !== "string" || !estCleEpinglable(cle)) {
    return { ok: false };
  }

  try {
    const epingles = await lireEpinglesKpi();
    const suivantes = epingles.includes(cle)
      ? epingles.filter((existante) => existante !== cle)
      : [...epingles, cle];

    await prisma.parametreSysteme.upsert({
      where: { cle: CLE_PARAMETRE_EPINGLES },
      create: {
        cle: CLE_PARAMETRE_EPINGLES,
        valeur: JSON.stringify(suivantes),
        updated_by: admin.id,
      },
      update: {
        valeur: JSON.stringify(suivantes),
        updated_by: admin.id,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/kpi");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
