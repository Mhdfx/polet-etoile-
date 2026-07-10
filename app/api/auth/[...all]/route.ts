import { toNextJsHandler } from "better-auth/next-js";
import { auth, originesAuthFiables } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

function origineMutationAutorisee(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return false;
  }

  const origine = request.headers.get("origin");
  if (!origine) {
    // Les navigateurs ajoutent Origin/Sec-Fetch-Site aux mutations. Autoriser
    // l'absence des deux conserve les scripts de recette non-navigateur sans
    // rouvrir la requete cross-site d'un navigateur.
    return request.headers.get("sec-fetch-site") === null;
  }

  try {
    return originesAuthFiables.includes(new URL(origine).origin);
  } catch {
    return false;
  }
}

function protegerMutation(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!origineMutationAutorisee(request)) {
      return Response.json(
        { message: "Origine de requete refusee" },
        { status: 403 },
      );
    }

    return handler(request);
  };
}

export const POST = protegerMutation(handlers.POST);
export const PATCH = protegerMutation(handlers.PATCH);
export const PUT = protegerMutation(handlers.PUT);
export const DELETE = protegerMutation(handlers.DELETE);
