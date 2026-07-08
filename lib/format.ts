import { DateTime } from "luxon";
import { arrondirMontant, type EntreeDecimal } from "@/lib/decimal";

export function formatMontant(valeur: EntreeDecimal): string {
  const [entier, decimales] = arrondirMontant(valeur).toFixed(2).split(".");
  const entierFormate = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${entierFormate},${decimales} DH`;
}

export function formatDate(date: Date | string): string {
  const dateTime = typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  return dateTime.setZone("Africa/Casablanca").toFormat("dd/MM/yyyy");
}

export function formatDateHeure(date: Date | string): string {
  const dateTime = typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  return dateTime.setZone("Africa/Casablanca").toFormat("dd/MM/yyyy HH:mm");
}
