export const entetesReponsePrivee = {
  "cache-control": "private, no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
} as const;

export function entetesFichierPrive(
  contentType: string,
  disposition: string,
): Record<string, string> {
  return {
    ...entetesReponsePrivee,
    "content-type": contentType,
    "content-disposition": disposition,
  };
}
