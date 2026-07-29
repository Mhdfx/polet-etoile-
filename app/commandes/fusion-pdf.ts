import { PDFDocument } from "pdf-lib";

export async function fusionnerPdfs(
  documents: Uint8Array[],
  titre: string,
): Promise<Uint8Array> {
  if (documents.length === 0) {
    throw new Error("Aucun PDF a fusionner");
  }

  const resultat = await PDFDocument.create();
  resultat.setTitle(titre);
  resultat.setAuthor("Coq Plus");
  resultat.setCreator("Coq Plus - Gestion commerciale");
  resultat.setProducer("Coq Plus");
  resultat.setCreationDate(new Date());

  for (const contenu of documents) {
    const source = await PDFDocument.load(contenu);
    const pages = await resultat.copyPages(source, source.getPageIndices());
    for (const page of pages) {
      resultat.addPage(page);
    }
  }

  return resultat.save({ useObjectStreams: true });
}
