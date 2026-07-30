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
  const destination = new URL(retour, request.url);
  destination.searchParams.set("erreurDocuments", message);
  return Response.redirect(destination, 303);
}
