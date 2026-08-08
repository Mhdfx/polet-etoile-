export function construireLienPage(
  chemin: string,
  params: Record<string, string | undefined>,
  page: number,
) {
  const query = new URLSearchParams();

  for (const [cle, valeur] of Object.entries(params)) {
    if (cle !== "page" && valeur) {
      query.set(cle, valeur);
    }
  }

  if (page > 1) {
    query.set("page", String(page));
  }

  const chaine = query.toString();
  return chaine ? `${chemin}?${chaine}` : chemin;
}
