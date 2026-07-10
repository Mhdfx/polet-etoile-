import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { estCheminLogoPublic, extensionLogoValide } from "@/lib/logo-upload";

// En production (`next start`), Next ne sert que les fichiers presents dans
// public/ AU MOMENT DU BUILD : un logo televerse au runtime repondrait 404.
// Cette route sert donc public/uploads/* depuis le disque a chaque requete.
// En dev, le serveur statique public/ prend la main avant cette route.
const RACINE_UPLOADS = path.join(process.cwd(), "public", "uploads");

const TYPES_AUTORISES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ chemin: string[] }> },
) {
  const { chemin } = await params;

  const cheminPublic = `/uploads/${chemin.join("/")}`;
  if (!estCheminLogoPublic(cheminPublic)) {
    return new NextResponse(null, { status: 404 });
  }

  // Confinement strict sous public/uploads : aucune traversee de chemin.
  const cheminRelatif = path.normalize(path.join(...chemin));
  if (cheminRelatif.startsWith("..") || path.isAbsolute(cheminRelatif)) {
    return new NextResponse(null, { status: 404 });
  }

  const cheminDisque = path.join(RACINE_UPLOADS, cheminRelatif);
  if (!cheminDisque.startsWith(RACINE_UPLOADS + path.sep)) {
    return new NextResponse(null, { status: 404 });
  }

  const typeContenu = TYPES_AUTORISES[path.extname(cheminDisque).toLowerCase()];
  if (!typeContenu) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const contenu = await readFile(cheminDisque);
    if (!extensionLogoValide(typeContenu, contenu)) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(contenu), {
      headers: {
        "Content-Type": typeContenu,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
