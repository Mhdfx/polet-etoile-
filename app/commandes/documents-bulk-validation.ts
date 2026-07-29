export const MAX_COMMANDES_DOCUMENTS = 100;

export type DocumentCommande = "bl" | "facture" | "bon_charge";
export type PorteeExport = "admin" | "commercial";

const DOCUMENTS_ADMIN: readonly DocumentCommande[] = [
  "bl",
  "facture",
  "bon_charge",
];
const DOCUMENTS_COMMERCIAL: readonly DocumentCommande[] = ["bl", "bon_charge"];
const schemaId = /^[A-Za-z0-9_-]+$/;

function valeursFormData(formData: FormData, cle: string): string[] {
  return formData
    .getAll(cle)
    .filter((valeur): valeur is string => typeof valeur === "string");
}

function reponseErreur(message: string, status = 400): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function validerCommandesDocuments(
  formData: FormData,
): string[] | Response {
  const ids = [...new Set(valeursFormData(formData, "commandeIds"))];

  if (ids.length === 0) {
    return reponseErreur("Selectionner au moins une commande.");
  }

  if (ids.length > MAX_COMMANDES_DOCUMENTS) {
    return reponseErreur(
      `Selectionner ${MAX_COMMANDES_DOCUMENTS} commandes au maximum.`,
    );
  }

  if (ids.some((id) => !schemaId.test(id))) {
    return reponseErreur("Selection de commandes invalide.");
  }

  return ids;
}

export function validerTypesDocuments(
  formData: FormData,
  portee: PorteeExport,
): DocumentCommande[] | Response {
  const valeurs = [...new Set(valeursFormData(formData, "documents"))];
  const autorises =
    portee === "admin" ? DOCUMENTS_ADMIN : DOCUMENTS_COMMERCIAL;
  const documents = valeurs.filter(
    (valeur): valeur is DocumentCommande =>
      autorises.includes(valeur as DocumentCommande),
  );

  if (documents.length !== valeurs.length) {
    return reponseErreur("Selection de documents invalide.", 403);
  }

  if (documents.length === 0) {
    return reponseErreur("Selectionner au moins un type de document autorise.");
  }

  return documents;
}
