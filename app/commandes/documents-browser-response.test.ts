import { describe, expect, it } from "vitest";
import { adapterErreurDocumentsPourNavigateur } from "./documents-browser-response";

describe("adapterErreurDocumentsPourNavigateur", () => {
  it("redirige une erreur de formulaire navigateur vers la liste", async () => {
    const request = new Request("https://coqplus.ma/commercial/commandes/documents", {
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    const response = new Response("Aucun bon de charge disponible.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });

    const resultat = await adapterErreurDocumentsPourNavigateur({
      request,
      response,
      retour: "/commercial/commandes",
    });

    expect(resultat.status).toBe(303);
    expect(resultat.headers.get("location")).toBe(
      "https://coqplus.ma/commercial/commandes?erreurDocuments=Aucun+bon+de+charge+disponible.",
    );
  });

  it("conserve le statut HTTP pour un appel non HTML", async () => {
    const request = new Request("https://coqplus.ma/commercial/commandes/documents", {
      headers: { accept: "application/json" },
    });
    const response = new Response("Interdit", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });

    const resultat = await adapterErreurDocumentsPourNavigateur({
      request,
      response,
      retour: "/commercial/commandes",
    });

    expect(resultat).toBe(response);
    expect(resultat.status).toBe(403);
  });

  it("utilise l'origine publique transmise par le reverse proxy", async () => {
    const request = new Request("http://localhost:3000/admin/commandes/documents", {
      headers: {
        accept: "text/html",
        host: "localhost:3000",
        "x-forwarded-host": "coqplus.ma",
        "x-forwarded-proto": "https",
      },
    });
    const response = new Response("Selectionner au moins une commande.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });

    const resultat = await adapterErreurDocumentsPourNavigateur({
      request,
      response,
      retour: "/admin/commandes",
    });

    expect(resultat.headers.get("location")).toBe(
      "https://coqplus.ma/admin/commandes?erreurDocuments=Selectionner+au+moins+une+commande.",
    );
  });
});
