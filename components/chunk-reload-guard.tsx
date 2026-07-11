"use client";

import { useEffect } from "react";

const CLE_RECHARGEMENT_CHUNK = "coq-plus:chunk-reload-at";
const DELAI_RECHARGEMENT_MS = 30_000;
let dernierRechargementMemoire = 0;

function estErreurChunkInvalide(erreur: unknown): boolean {
  const texte =
    erreur instanceof Error
      ? `${erreur.name} ${erreur.message} ${erreur.stack ?? ""}`
      : String(erreur ?? "");

  return [
    "ChunkLoadError",
    "Loading chunk",
    "Loading CSS chunk",
    "failed to fetch dynamically imported module",
    "importing a module script failed",
    "Unable to preload CSS",
  ].some((signature) => texte.toLowerCase().includes(signature.toLowerCase()));
}

function rechargerUneFois() {
  const maintenant = Date.now();
  let dernier = dernierRechargementMemoire;

  try {
    dernier = Number(window.sessionStorage?.getItem(CLE_RECHARGEMENT_CHUNK) ?? "0");
  } catch {
    dernier = dernierRechargementMemoire;
  }

  if (Number.isFinite(dernier) && maintenant - dernier < DELAI_RECHARGEMENT_MS) {
    return;
  }

  dernierRechargementMemoire = maintenant;
  try {
    window.sessionStorage?.setItem(CLE_RECHARGEMENT_CHUNK, String(maintenant));
  } catch {
    // Certains contextes restreints peuvent bloquer le stockage de session.
  }
  window.location.reload();
}

export function ChunkReloadGuard() {
  useEffect(() => {
    function gererErreur(event: ErrorEvent) {
      if (estErreurChunkInvalide(event.error) || estErreurChunkInvalide(event.message)) {
        rechargerUneFois();
      }
    }

    function gererRejet(event: PromiseRejectionEvent) {
      if (estErreurChunkInvalide(event.reason)) {
        rechargerUneFois();
      }
    }

    window.addEventListener("error", gererErreur);
    window.addEventListener("unhandledrejection", gererRejet);

    return () => {
      window.removeEventListener("error", gererErreur);
      window.removeEventListener("unhandledrejection", gererRejet);
    };
  }, []);

  return null;
}
