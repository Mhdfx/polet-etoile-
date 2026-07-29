import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { fusionnerPdfs } from "./fusion-pdf";

async function creerPdf(nombrePages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < nombrePages; index += 1) {
    pdf.addPage([595, 842]);
  }
  return pdf.save();
}

describe("fusionnerPdfs", () => {
  it("produit un seul PDF en conservant l'ordre et toutes les pages", async () => {
    const fusion = await fusionnerPdfs(
      [await creerPdf(1), await creerPdf(2), await creerPdf(1)],
      "Dossier commandes QA",
    );
    const resultat = await PDFDocument.load(fusion);

    expect(resultat.getPageCount()).toBe(4);
    expect(resultat.getTitle()).toBe("Dossier commandes QA");
    expect(new TextDecoder().decode(fusion.subarray(0, 5))).toBe("%PDF-");
  });
});
