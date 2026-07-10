import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "@/lib/db";

const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const authBaseUrlIsLocal =
  authBaseUrl.includes("localhost") || authBaseUrl.includes("127.0.0.1");

const originesProduction = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
]
  .filter((url): url is string => Boolean(url))
  .map((url) => url.replace(/\/$/, ""));

export const auth = betterAuth({
  appName: "Poulet Etoile",
  baseURL: authBaseUrlIsLocal
    ? {
        allowedHosts: [
          "localhost:3000",
          "127.0.0.1:3000",
          "localhost:3107",
          "127.0.0.1:3107",
        ],
        fallback: authBaseUrl,
        protocol: "http",
      }
    : authBaseUrl,
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3107",
    "http://127.0.0.1:3107",
    ...originesProduction,
  ],
  secret: process.env.BETTER_AUTH_SECRET,
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
    minPasswordLength: 8,
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
