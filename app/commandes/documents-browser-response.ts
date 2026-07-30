export async function adapterErreurDocumentsPourNavigateur({
  request,
  response,
  retour,
}: {
  request: Request;
  response: Response;
  retour: string;
}): Promise<Response> {
  const accepteHtml = (request.headers.get("accept") ?? "").includes("text/html");
  const estErreurTexte =
    response.status >= 400 &&
    (response.headers.get("content-type") ?? "").startsWith("text/plain");

  if (!accepteHtml || !estErreurTexte) {
    return response;
  }

  const message = (await response.text()).trim() || "Le document n'a pas pu être généré.";
  const urlRequete = new URL(request.url);
  const hotePublic =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocolePublic =
    request.headers.get("x-forwarded-proto") ?? urlRequete.protocol.replace(":", "");
  const originePublique = hotePublic
    ? `${protocolePublic}://${hotePublic}`
    : urlRequete.origin;
  const destination = new URL(retour, originePublique);
  destination.searchParams.set("erreurDocuments", message);
  return Response.redirect(destination, 303);
}
