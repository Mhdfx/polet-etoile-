"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

type ThemeChoisi = "bleu" | "rouge" | "vert" | "ardoise" | "sombre";
const CLE_THEME = "coq-plus-theme";

function appliquerTheme(theme: ThemeChoisi) {
  const racine = document.documentElement;
  racine.classList.toggle("dark", theme === "sombre");
  racine.dataset.palette = theme === "sombre" ? "bleu" : theme;
  racine.style.colorScheme = theme === "sombre" ? "dark" : "light";
}

export function SelecteurTheme() {
  const [theme, setTheme] = useState<ThemeChoisi>("bleu");

  useEffect(() => {
    const memorise = window.localStorage.getItem(CLE_THEME) as ThemeChoisi | null;
    const initial = memorise && ["bleu", "rouge", "vert", "ardoise", "sombre"].includes(memorise)
      ? memorise
      : "bleu";
    setTheme(initial);
    appliquerTheme(initial);
  }, []);

  function changerTheme(valeur: ThemeChoisi) {
    setTheme(valeur);
    appliquerTheme(valeur);
    window.localStorage.setItem(CLE_THEME, valeur);
  }

  return (
    <label className="relative flex min-h-11 items-center" title="Theme et palette de couleurs">
      <Palette className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Theme et palette</span>
      <select
        value={theme}
        onChange={(evenement) => changerTheme(evenement.target.value as ThemeChoisi)}
        aria-label="Theme et palette de couleurs"
        className="h-9 max-w-32 rounded-lg border border-input bg-card pl-8 pr-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="bleu">Bleu Coq Plus</option>
        <option value="rouge">Rouge Coq Plus</option>
        <option value="vert">Vert</option>
        <option value="ardoise">Ardoise</option>
        <option value="sombre">Mode sombre</option>
      </select>
    </label>
  );
}
