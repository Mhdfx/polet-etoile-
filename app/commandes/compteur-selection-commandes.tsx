"use client";

import { useEffect, useRef, useState } from "react";

export function CompteurSelectionCommandes() {
  const repere = useRef<HTMLSpanElement>(null);
  const [nombre, setNombre] = useState(0);

  useEffect(() => {
    const formulaireTrouve = repere.current?.closest("form");
    if (!formulaireTrouve) return;
    const formulaire = formulaireTrouve;

    function actualiser() {
      const selectionnees = formulaire.querySelectorAll<HTMLInputElement>(
        'input[name="commandeIds"]:checked:not(:disabled)',
      );
      const identifiants = new Set(
        Array.from(selectionnees, (element) => element.value),
      );
      setNombre(identifiants.size);
    }

    actualiser();
    formulaire.addEventListener("change", actualiser);
    return () => formulaire.removeEventListener("change", actualiser);
  }, []);

  return (
    <span ref={repere} aria-live="polite" className="font-medium text-foreground">
      {nombre} commande{nombre > 1 ? "s" : ""} sélectionnée{nombre > 1 ? "s" : ""}
    </span>
  );
}
