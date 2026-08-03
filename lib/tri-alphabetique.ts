const collateurFrancais = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

export function comparerAlphabetiquement(a: string, b: string): number {
  return collateurFrancais.compare(a, b);
}

export function trierAlphabetiquement<T>(
  valeurs: readonly T[],
  texte: (valeur: T) => string,
): T[] {
  return [...valeurs].sort((a, b) => comparerAlphabetiquement(texte(a), texte(b)));
}
