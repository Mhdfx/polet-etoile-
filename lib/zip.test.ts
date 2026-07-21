import { describe, expect, it } from "vitest";
import { creerZip } from "@/lib/zip";

describe("creerZip", () => {
  it("cree une archive ZIP stockee avec les noms et contenus attendus", () => {
    const zip = creerZip([
      { chemin: "client-a/BL-001.pdf", contenu: new TextEncoder().encode("PDF A") },
      { chemin: "client-a/FACTURE-001.pdf", contenu: new TextEncoder().encode("PDF B") },
    ]);
    const texte = new TextDecoder().decode(zip);
    const vue = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

    expect(vue.getUint32(0, true)).toBe(0x04034b50);
    expect(vue.getUint32(zip.byteLength - 22, true)).toBe(0x06054b50);
    expect(texte).toContain("client-a/BL-001.pdf");
    expect(texte).toContain("client-a/FACTURE-001.pdf");
    expect(texte).toContain("PDF A");
    expect(texte).toContain("PDF B");
  });
});
