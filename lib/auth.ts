import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "@/lib/db";

const estProduction = process.env.NODE_ENV === "production";
const authSecret = process.env.BETTER_AUTH_SECRET;
const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

if (estProduction && (!authSecret || authSecret.length < 32)) {
  throw new Error(
    "BETTER_AUTH_SECRET doit contenir au moins 32 caracteres en production",
  );
}

let authUrl: URL;
try {
  authUrl = new URL(authBaseUrl);
} catch {
  throw new Error("BETTER_AUTH_URL doit etre une URL absolue valide");
}

const authBaseUrlIsLocal = ["localhost", "127.0.0.1", "::1"].includes(
  authUrl.hostname,
);
const originesLocales = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3107",
  "http://127.0.0.1:3107",
];

function origineConfiguree(valeur: string | undefined): string | undefined {
  if (!valeur) {
    return undefined;
  }

  try {
    const url = new URL(valeur);
    if (!authBaseUrlIsLocal && url.protocol !== "https:") {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

const originesConfigurees = [
  origineConfiguree(process.env.BETTER_AUTH_URL),
  origineConfiguree(process.env.NEXT_PUBLIC_APP_URL),
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origine) => origineConfiguree(origine.trim())),
].filter((origine): origine is string => Boolean(origine));

export const originesAuthFiables = Array.from(
  new Set([
    ...(authBaseUrlIsLocal ? originesLocales : []),
    authUrl.origin,
    ...originesConfigurees,
  ]),
);

const proxiesDeConfiance = (process.env.AUTH_TRUSTED_PROXIES ?? "")
  .split(",")
  .map((proxy) => proxy.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "Poulet Etoile",
  baseURL: authBaseUrlIsLocal
    ? {
        allowedHosts: [
          authUrl.host,
          "localhost:3000",
          "127.0.0.1:3000",
          "localhost:3107",
          "127.0.0.1:3107",
        ],
        fallback: authBaseUrl,
        protocol: "http",
      }
    : authBaseUrl,
  trustedOrigins: originesAuthFiables,
  secret: authSecret,
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
  },
  advanced: {
    useSecureCookies: authUrl.protocol === "https:",
    ipAddress:
      proxiesDeConfiance.length > 0
        ? { trustedProxies: proxiesDeConfiance }
        : undefined,
  },
  // CDC 12.1 : limitation du taux de tentatives de connexion.
  // 5 essais par minute et par IP sur le sign-in, puis blocage temporaire.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "mysql",
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    // Compatibilite recette : minimum 6 caracteres. Les creations admin passent
    // aussi par Zod (schemaCreationUtilisateur).
    minPasswordLength: 6,
  },
  disabledPaths: ["/sign-in/email", "/sign-up/email"],
  user: {
    fields: {
      name: "nom_complet",
      emailVerified: "email_verifie",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      role: {
        type: ["ADMIN", "COMMERCIAL"],
        required: true,
        defaultValue: "COMMERCIAL",
      },
      actif: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
      derniere_connexion_at: {
        type: "date",
        required: false,
        input: false,
      },
      deleted_at: {
        type: "date",
        required: false,
        input: false,
        returned: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          try {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: session.userId },
                data: { derniere_connexion_at: new Date() },
              }),
              prisma.auditLog.create({
                data: {
                  utilisateur_id: session.userId,
                  action: "auth.connexion",
                  entite: "sessions",
                  entite_id: session.id,
                },
              }),
            ]);
          } catch (erreur) {
            console.error("[auth:session.create] audit connexion impossible", erreur);
          }
        },
      },
    },
  },
  plugins: [
    username({
      schema: {
        user: {
          fields: {
            username: "nom_utilisateur",
            displayUsername: "nom_utilisateur",
          },
        },
      },
    }),
    nextCookies(),
  ],
});
