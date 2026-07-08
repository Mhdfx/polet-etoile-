import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "@/lib/db";

const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const authBaseUrlIsLocal =
  authBaseUrl.includes("localhost") || authBaseUrl.includes("127.0.0.1");

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
  ],
  secret: process.env.BETTER_AUTH_SECRET,
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
          await prisma.user.update({
            where: { id: session.userId },
            data: { derniere_connexion_at: new Date() },
          });
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
