import { DateTime } from "luxon";

export const FUSEAU_APPLICATION = "Africa/Casablanca";

export function dateLocaleCasablanca(dateIso: string): DateTime {
  return DateTime.fromISO(dateIso, { zone: FUSEAU_APPLICATION }).startOf("day");
}

export function bornesJourneeInclusive(debutIso: string, finIso: string): { debutUtc: Date; finExclusiveUtc: Date } {
  const debut = dateLocaleCasablanca(debutIso);
  const finExclusive = dateLocaleCasablanca(finIso).plus({ days: 1 });

  if (!debut.isValid || !finExclusive.isValid) {
    throw new Error("Période invalide");
  }

  if (finExclusive <= debut) {
    throw new Error("La date de fin doit être égale ou postérieure à la date de début");
  }

  return {
    debutUtc: debut.toUTC().toJSDate(),
    finExclusiveUtc: finExclusive.toUTC().toJSDate(),
  };
}
