const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHEMIN_LOGO_PUBLIC = /^\/uploads\/logos\/logo-[0-9a-f-]+\.(png|jpg)$/i;

export function extensionLogoValide(
  typeAnnonce: string,
  contenu: Buffer,
): "png" | "jpg" | null {
  if (
    typeAnnonce === "image/png" &&
    contenu.length >= SIGNATURE_PNG.length &&
    contenu.subarray(0, SIGNATURE_PNG.length).equals(SIGNATURE_PNG)
  ) {
    return "png";
  }

  if (
    typeAnnonce === "image/jpeg" &&
    contenu.length >= 3 &&
    contenu[0] === 0xff &&
    contenu[1] === 0xd8 &&
    contenu[2] === 0xff
  ) {
    return "jpg";
  }

  return null;
}

export function estCheminLogoPublic(valeur: string): boolean {
  return CHEMIN_LOGO_PUBLIC.test(valeur);
}
