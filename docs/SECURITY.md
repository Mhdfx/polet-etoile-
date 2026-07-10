# Revue de securite du code

Derniere revue : 10/07/2026.

## Perimetre analyse

- Better Auth : connexion username/password, cookies, sessions, origines, rate limit.
- Autorisations : pages, Server Actions, routes PDF/Excel et isolation commercial.
- Validation Zod, acces Prisma/MySQL, audit transactionnel et IP proxy.
- Upload logo, lecture de fichiers, jobs d'export et donnees telechargeables.
- En-tetes HTTP, cache navigateur, secrets, seed et dependances NPM.

## Corrections appliquees

- Origines localhost retirees de la liste de confiance quand l'URL auth est externe.
- Garde CSRF explicite sur POST/PATCH/PUT/DELETE de `/api/auth/*` : origine absente,
  inconnue ou `Sec-Fetch-Site: cross-site` refusee avec HTTP 403.
- Secret auth de 32 caracteres minimum en production, cookies `Secure` sous HTTPS,
  session limitee a 12 heures et cookie non persistant a la connexion.
- Jobs Excel lies a leur createur ou au role admin, metadata validee par Zod,
  erreurs internes masquees et expiration/suppression apres 24 heures.
- PDF et Excel servis avec `private, no-store` et `nosniff`.
- Upload limite a PNG/JPG de 2 Mo avec verification de signature binaire. SVG refuse.
  La route runtime ne sert que les noms de logos generes et revalide le contenu.
- IP d'audit acceptee uniquement si IPv4/IPv6 valide, ce qui empeche l'injection
  d'une valeur trop longue de faire echouer la transaction metier.
- CSP, anti-framing, referrer policy, permissions policy, HSTS et suppression de
  `X-Powered-By` dans la configuration Next.js.
- Les nouveaux mots de passe admin exigent 12 caracteres. Les mots de passe seed
  connus restent disponibles uniquement en local ; en production ils doivent etre
  fournis explicitement par variables d'environnement.
- `DATABASE_URL` n'a plus de valeur de secours dans la configuration Prisma.
- Token de session retire de la selection de la page admin sessions.
- `@hono/node-server` force sur la version corrigee 1.19.13.

## Risques residuels

- `npm audit --omit=dev` signale 5 vulnerabilites moderees, sans high/critical :
  PostCSS embarque par Next.js et UUID embarque par ExcelJS. Les chemins vulnerables
  ne traitent ici ni CSS utilisateur ni API UUID v3/v5/v6 avec buffer. Les corrections
  proposees par NPM imposent des downgrades majeurs incompatibles ; surveiller les
  mises a jour Next.js/ExcelJS et reexecuter l'audit.
- Le rate limit Better Auth est en memoire, adapte a une instance. Avant de lancer
  plusieurs instances, migrer ce compteur vers un stockage partage.
- `AUTH_TRUSTED_PROXIES` doit contenir les IP/CIDR exacts du reverse proxy et le port
  applicatif ne doit pas etre expose directement a Internet.
- TLS/HTTPS, rotation des secrets, sauvegardes MySQL, journalisation centralisee et
  scan d'infrastructure restent des responsabilites de deploiement.
- La CSP conserve `unsafe-inline`, requis par le rendu Next.js actuel. Elle bloque
  tout de meme les objets, le framing, les bases externes et les origines non prevues.

## Verification

- `npm run prisma:validate` : OK.
- `npx tsc --noEmit` : OK.
- `npm run lint` : OK.
- `npm run test` : 110/110 OK.
- `npm run build` : OK.
- `npm audit --omit=dev` : 0 high, 0 critical, 5 moderate documentees ci-dessus.
- Smoke production `:3112` : cross-site auth 403, logins legitimes 200, export
  createur 200/autre commercial 404, PDF `private, no-store`, SVG runtime 404.
