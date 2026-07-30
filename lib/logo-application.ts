import { cache } from "react";
import { access } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { estCheminLogoPublic } from "@/lib/logo-upload";

export const LOGO_APPLICATION_REPLI = "/cachet.png";

export function choisirLogoApplication(valeur?: string | null): string {
  return valeur && estCheminLogoPublic(valeur)
    ? valeur
    : LOGO_APPLICATION_REPLI;
}

export const chargerLogoApplication = cache(async (): Promise<string> => {
  const parametre = await prisma.parametreSysteme.findUnique({
    where: { cle: "logo_url" },
    select: { valeur: true },
  });

  const logo = choisirLogoApplication(parametre?.valeur);
  if (logo === LOGO_APPLICATION_REPLI) {
    return logo;
  }

  try {
    await access(path.join(process.cwd(), "public", ...logo.replace(/^\/+/, "").split("/")));
    return logo;
  } catch {
    return LOGO_APPLICATION_REPLI;
  }
});
