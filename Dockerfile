FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variables factices limitees a chaque commande de build : lib/db.ts exige
# DATABASE_URL a l'import, mais aucune connexion n'est ouverte ici. Elles ne
# persistent ni dans les couches suivantes ni dans l'image d'execution.
RUN DATABASE_URL="mysql://build:build@127.0.0.1:3306/build" \
    BETTER_AUTH_SECRET="dummy-build-only-not-used-at-runtime" \
    npm run prisma:generate
RUN DATABASE_URL="mysql://build:build@127.0.0.1:3306/build" \
    BETTER_AUTH_SECRET="dummy-build-only-not-used-at-runtime" \
    npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# next.config.ts est relu par `next start` au demarrage : sans lui les options
# runtime (poweredByHeader: false, etc.) retombent sur les defauts Next.
COPY --from=builder /app/next.config.ts ./next.config.ts
# tsconfig.json + lib/ requis par `npm run seed` (tsx resout l'alias @/lib/*
# de prisma/seed.ts via tsconfig) — sans eux le seed echoue dans le conteneur.
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/lib ./lib
# scripts/ requis pour npm run sync:catalogue, seed et reset en conteneur.
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p public/uploads/logos exports-prive && chown -R nextjs:nextjs /app \
  && chmod +x ./scripts/docker-entrypoint.sh
USER nextjs

EXPOSE 3000
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
