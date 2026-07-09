# testplan.md — Plan de test navigateur complet (Poulet Étoilé / Naomedia)

Plan de recette manuelle à dérouler dans le navigateur pour valider **toutes** les
fonctionnalités contre `cdc.md` (recette fonctionnelle 16.1 + robustesse 16.2).

**Légende** : `[x]` = validé · `[ ]` 🟡 = partiel (préciser) · `[ ]` ⏳ = à rejouer
manuellement · ❌→✔ = échec corrigé, à re-vérifier rapidement.

---

## Résultats campagne 09/07/2026 (localhost:3107, build prod, base seedée)

| Statut | Nombre | Détail |
|---|---|---|
| PASS | ~52 | Auth, permissions, périodes invalides, PDF, exports sécurisés, perf |
| PARTIAL | ~18 | UI présente, flux complet non rejoué |
| MANUAL | ~28 | Mobile/Safari, double-clic, offline, concurrence, croisements |
| FAIL | 2 | **DASHA-05 et RET-01 — corrigés le 09/07** (voir ci-dessous) |

Corrections apportées suite à la campagne :

- **DASHA-05 corrigé** : raccourci « Objectifs commerciaux » du dashboard pointait
  vers `/admin/utilisateurs` → maintenant `/admin/objectifs` (vérifié runtime).
- **RET-01 corrigé** : note CDC « Le retour est horodaté automatiquement et lié à
  votre compte. » ajoutée sous le formulaire retours (vérifié runtime).
- **500 intermittent `/admin/kpi`** : non reproduit après correction — 20 puis 60
  requêtes parallèles mixtes puis 120 requêtes séquentielles rapides = **200/200,
  zéro erreur**, aucun message pool/timeout dans les logs. Cause la plus probable :
  interaction du rate limit avec le script de campagne (reconnexions répétées).
  À surveiller en recette ; si reproduit, capturer `next start` logs.

> **Note campagnes automatisées** : le rate limit CDC 12.1 limite le **sign-in** à
> 5/min/IP. Se connecter **une fois** par campagne et réutiliser le cookie de
> session ; après un 429, attendre 60 s. Ne pas relancer les logins en boucle.

---

## 0. Prérequis

- Base seedée : `npm run seed` (26 produits catalogue CDC + client sans commande,
  produit désactivé, commandes payée/partielle/externe + 1 000 commandes volume).
- Build production : `npm run build` puis `npx next start -p 3107`
  (aligner `BETTER_AUTH_URL` sur le port utilisé).
- Navigateurs cibles : Chrome desktop, Chrome mobile et Safari iOS (CDC §13).
- Automatisation disponible : `npm run test` (102 Vitest) ; `scripts/testplan-full.ps1`
  (35 checks HTTP — respecter le cooldown rate limit ci-dessus).

Comptes seed :

| Rôle | Utilisateur | Mot de passe |
|---|---|---|
| Admin | `admin` | `password` |
| Commercial | `commercial.nord` | `commercial123` |
| Commercial | `commercial.sud` | `commercial123` |

---

## 1. Authentification (CDC 5.1, 12.1)

- [x] **AUTH-01** Connexion admin → `/admin`, bandeau « Connecté : Administrateur · Rôle : ADMINISTRATEUR ». *(09/07)*
- [x] **AUTH-02** Connexion commercial → `/commercial`. *(09/07)*
- [x] **AUTH-03** Identifiants invalides → 401 générique, sans préciser quel champ est faux. *(09/07)*
- [ ] **AUTH-04** ⏳ Bouton œil afficher/masquer le mot de passe (présent dans le code, clic à rejouer).
- [x] **AUTH-05** Mention « Connexion chiffrée et protégée » visible. *(09/07)*
- [x] **AUTH-06** Rate limiting : 6 tentatives échouées → 429 ; recommencer après 1 min fonctionne. *(09/07)*
- [ ] **AUTH-07** ⏳ Déconnexion → `/connexion`, retour arrière ne réaffiche pas de données.
- [ ] **AUTH-08** 🟡 Entrées auth présentes dans l'audit ; vérifier la paire `auth.connexion`/`auth.deconnexion` d'une même session.

## 2. Permissions serveur (CDC 8, 12.3, 16.2)

- [x] **PERM-01** Anonyme sur `/admin`, `/commercial`, `/admin/commandes` → connexion, aucune donnée. *(09/07)*
- [x] **PERM-02** Commercial → `/admin` → 403. *(09/07)*
- [x] **PERM-03** Nord sur commande de Sud → 403, aucun montant/BL exposé. *(09/07)*
- [x] **PERM-04** PDF cross-commercial → refus (pas d'application/pdf). *(09/07)*
- [ ] **PERM-05** ⏳ Fiche client d'un autre commercial par URL directe → 403.
- [x] **PERM-06** Commercial sur `/admin/commandes/export` → refusé, pas de xlsx. *(09/07)*
- [ ] **PERM-07** ⏳ 403 identique que la ressource existe ou non (comparer id réel vs bidon).
- [x] **PERM-08** Pages 404 et 500 dédiées avec lien retour. *(09/07)*

## 3. Tableau de bord commercial (CDC 5.2)

- [x] **DASHC-01** 5 cartes KPI avec montants formatés. *(09/07)*
- [x] **DASHC-02** Chiffres du commercial connecté uniquement (Nord 49 228,00 DH vs Sud 2 240,00 DH). *(09/07)*
- [ ] **DASHC-03** ⏳ Raccourcis Ventes tous cliquables.
- [ ] **DASHC-04** ⏳ Jauge objectif mensuel si objectif défini.
- [ ] **DASHC-05** ⏳ Bouton de déconnexion en bas de page.
- [ ] **DASHC-06** ⏳ Nouveau commercial sans données : « 0,00 DH » / « — », jamais NaN.

## 4. Tableau de bord admin (CDC 6.4)

- [x] **DASHA-01** Vue consolidée OK. *(09/07)*
- [ ] **DASHA-02** ⏳ Sélecteur de commercial filtre les KPI (changer interactivement).
- [x] **DASHA-03** Période par défaut 01/01/2026 → aujourd'hui. *(09/07)*
- [ ] **DASHA-04** ⏳ `fin < début` sur le dashboard → message, pas de crash (tester au clic).
- [ ] **DASHA-05** ❌→✔ Raccourci « Objectifs commerciaux » pointait vers `/admin/utilisateurs` — **corrigé** vers `/admin/objectifs` (vérifié 09/07) ; re-cliquer pour confirmer.
- [ ] **DASHA-06** 🟡 Section « KPI épinglés » rendue quand des épingles existent (vérifié via données) ; valider le flux clic complet avec KPI-14.

## 5. Nouvelle commande (CDC 5.3, 7.1, 7.3, 10.5, 10.6, 11)

> Calculs, doublon produit, quantités, produit inactif, total falsifié et
> permissions sont couverts par Vitest. À rejouer **en navigateur** :

- [ ] **CMD-01** ⏳ Liste clients : uniquement les clients actifs du commercial.
- [ ] **CMD-02** ⏳ Bouton « + » client à la volée (modal), sélectionnable immédiatement.
- [ ] **CMD-03** ⏳ Prix catalogue non modifiable en saisie libre.
- [ ] **CMD-04** ⏳ Prix net et total recalculés en temps réel.
- [ ] **CMD-05** ⏳ `12,750` kg accepté ; quantité ≤ 0 → erreur près du champ.
- [ ] **CMD-06** ⏳ Produit désactivé absent de la liste (couvert Vitest côté serveur).
- [ ] **CMD-07** ⏳ Commande sans ligne bloquée, aucune commande fantôme.
- [ ] **CMD-08** ⏳ Même produit deux fois → rejeté (couvert Vitest côté serveur).
- [ ] **CMD-09** ⏳ Enregistrer → BL séquentiel préfixé, statut « Non réglée », visible dans la liste.
- [ ] **CMD-10** ⏳ Double-clic → 1 seule commande, 1 seul BL.
- [ ] **CMD-11** ⏳ 2 onglets nord+sud quasi simultanés → 2 BL distincts séquentiels.
- [ ] **CMD-12** ⏳ Brouillon restauré après rechargement.
- [ ] **CMD-13** ⏳ Mode offline → message clair, submit bloqué.
- [ ] **CMD-14** ⏳ Session expirée pendant la saisie → redirection propre, brouillon restauré.
- [ ] **CMD-15** ⏳ Admin commande au nom d'un commercial + commande externe ; audité.

## 6. Listes de commandes (CDC 5.4, 13, 16.1)

- [ ] **LST-01** ⏳ Colonnes complètes (Client, Région, Date, Date règlement, Commercial, Statut, Montant, BL).
- [ ] **LST-02** ⏳ Pagination : total/pages affichés, Première/Précédente/Suivante/Dernière.
- [ ] **LST-03** ⏳ Sélecteur 10 / 25 / 50 / 100.
- [x] **LST-04** HTTP 562–811 ms par page avec 1 003 commandes (< 1 s). *(09/07)*
- [ ] **LST-05** ⏳ Recherche client/BL + réinitialisation.
- [ ] **LST-06** ⏳ Filtres statut/commercial/type combinables.
- [x] **LST-07** Période invalide → message + liste vide. *(09/07)*
- [ ] **LST-08** ⏳ Aucun résultat → message explicite.
- [x] **LST-09** Nord voit 502 commandes, admin 1 003. *(09/07)*
- [ ] **LST-10** ⏳ Lisible sur mobile.

## 7. Commandes externes (CDC 5.5)

- [x] **EXT-01** Vue externes charge, filtrée sur le type externe. *(09/07)*
- [ ] **EXT-02** ⏳ Filtre multi-sélection clients externes.
- [ ] **EXT-03** ⏳ Export Excel du tableau filtré, nom `commandes_externes_AAAA-MM-JJ.xlsx`.
- [ ] **EXT-04** ⏳ Résultat vide → « Aucune commande externe trouvée ».

## 8. Détail commande & paiements (CDC 7.5, règles projet)

- [ ] **PAY-01** 🟡 Détail commande partielle seed OK ; vérifier lignes figées/total/payé/reste sur plusieurs cas.
- [ ] **PAY-02** ⏳ Ajout paiement (4 modes, référence optionnelle) → reste dû recalculé.
- [ ] **PAY-03** ⏳ Paiement > reste dû refusé (couvert Vitest côté serveur).
- [ ] **PAY-04** ⏳ Statut « Réglée » exactement quand reste dû = 0 ; date règlement dérivée.
- [ ] **PAY-05** ⏳ Paiement visible dans l'audit.
- [x] **PAY-06** Permissions paiement commercial refusées (Vitest). *(09/07)*
- [ ] **PAY-07** ⏳ Aucune édition de lignes après création.
- [ ] **PAY-08** ⏳ Suppression admin : soft delete + audit.
- [ ] **PAY-09** ⏳ `/admin/paiements` : filtres, KPI encaissement, historique récent.

## 9. PDF Bon de livraison (CDC 9.1, 11.7)

- [x] **PDF-01** PDF généré (~3,5 Ko, `application/pdf`) avec statut de règlement. *(09/07)*
- [ ] **PDF-02** ⏳ En-tête ICE/RC/raison sociale du paramétrage + logo PNG/JPG téléversé.
- [ ] **PDF-03** ⏳ Montants identiques au centime écran/PDF.
- [ ] **PDF-04** ⏳ Quantités décimales identiques écran/PDF.
- [ ] **PDF-05** ⏳ Changement de prix catalogue → PDF ancien inchangé (prix figés).

## 10. Exports Excel (CDC 9.2, 6.11, 11.7)

- [ ] **XLS-01** ⏳ Ouverture Excel + Google Sheets sans erreur.
- [ ] **XLS-02** ⏳ Colonnes conformes, filtres respectés, statut « Réglée / Non réglée ».
- [ ] **XLS-03** ⏳ Montants au centime écran = PDF = Excel (3 commandes dont décimale).
- [x] **XLS-04** Période invalide → HTTP 400. *(09/07)*
- [ ] **XLS-05** 🟡 Jobs persistés sur disque (code) ; rejouer : gros export → redémarrer `next start` → re-télécharger le lien.
- [x] **XLS-06** Export anonyme refusé. *(09/07)*
- [x] **XLS-07** `/admin/exports` + mention sauvegarde infra. *(09/07)*
- [ ] **XLS-08** ⏳ Export audit filtré.

## 11. Retours magasin (CDC 5.6)

- [ ] **RET-01** ❌→✔ Note CDC absente — **corrigée** : « Le retour est horodaté automatiquement et lié à votre compte. » sous le formulaire (vérifié 09/07) ; confirmer visuellement.
- [ ] **RET-02** ⏳ Création → horodatage auto, rattaché au commercial, audité.
- [ ] **RET-03** ⏳ Non modifiable après saisie.
- [x] **RET-04** Filtre période Date début/fin + Filtrer + Reset présents. *(09/07)*
- [ ] **RET-05** ⏳ Période invalide → message + liste vide (vérifié HTTP le 09/07, confirmer au clic).
- [ ] **RET-06** ⏳ Quantité ≤ 0 / texte → rejet serveur (couvert Vitest).
- [ ] **RET-07** ⏳ Vue admin : tous les retours + colonne commercial.

## 12. Produits & catégories (CDC 6.1, 7.7)

- [x] **PRD-01** Liste admin charge (recherche/statut/pagination présents). *(09/07)*
- [ ] **PRD-02** ⏳ Création + doublon de nom actif refusé.
- [ ] **PRD-03** ⏳ Prix négatif / > 2 décimales rejeté.
- [ ] **PRD-04** ⏳ Changement de prix → historique (ancien/nouveau/auteur/date).
- [ ] **PRD-05** ⏳ Les commandes passées ne bougent pas.
- [ ] **PRD-06** ⏳ Prix en masse avec confirmation ; rollback complet sur erreur.
- [ ] **PRD-07** ⏳ Désactivation/réactivation, jamais de suppression physique.
- [ ] **PRD-08** ⏳ Catégories créer/renommer/réordonner, accents corrects.
- [ ] **PRD-09** ⏳ Actions auditées.

## 13. Utilisateurs (CDC 6.2, 10.6)

> Actions serveur couvertes par Vitest (unicité, protections dernier admin,
> invalidation sessions). À rejouer en navigateur :

- [ ] **USR-01** ⏳ Liste, recherche, filtres, dernière connexion.
- [ ] **USR-02** ⏳ Création avec règles nom/mot de passe.
- [ ] **USR-03** ⏳ Reset mot de passe → sessions invalidées.
- [ ] **USR-04** ⏳ Désactivation compte actif → déconnecté en quelques secondes, reconnexion refusée.
- [ ] **USR-05** ⏳ Auto-désactivation et dernier admin bloqués (couvert Vitest).
- [ ] **USR-06** ⏳ Suppression logique, historique conservé.
- [ ] **USR-07** ⏳ Audit.

## 14. Clients & fiches (CDC 6.3, 6.6, 10.6)

- [ ] **CLI-01** ⏳ Liste consolidée admin, filtres, pagination.
- [ ] **CLI-02** ⏳ Commercial : son portefeuille uniquement.
- [ ] **CLI-03** ⏳ Création avec trim, ville liste fermée, téléphone optionnel.
- [ ] **CLI-04** ⏳ Fiche : totaux commandé/réglé/non réglé + BL.
- [ ] **CLI-05** 🟡 Popup BL présent sur la fiche (dialogue rendu) ; **rejouer le clic réel** : lignes produits, total, statut, lien détail.
- [ ] **CLI-06** ⏳ Réaffectation commercial auditée ; l'ancien perd l'accès.
- [ ] **CLI-07** ⏳ Fusion doublons : réattribution + soft delete + audit `client.fusion`.
- [ ] **CLI-08** ⏳ Suppression logique.
- [ ] **CLI-09** ⏳ Clients externes : mêmes vérifications.

## 15. Objectifs commerciaux (CDC 6.8)

- [x] **OBJ-01** `/admin/objectifs` : ligne par commercial + TOTAL. *(09/07)*
- [ ] **OBJ-02** ⏳ Édition inline mois courant reflétée immédiatement.
- [ ] **OBJ-03** ⏳ Mois clos en lecture seule ; modification rejetée serveur (couvert Vitest).
- [ ] **OBJ-04** ⏳ Historique par commercial.
- [ ] **OBJ-05** ⏳ Jauge dashboard commercial.

## 16. Audit KPI's (CDC 5.7, 6.5, 7.4)

- [ ] **KPI-01** 🟡 Données commercial visibles ; vérifier l'isolement nord/sud sur les mêmes filtres.
- [ ] **KPI-02→10** 🟡 Tous les blocs rendus avec données (filtres, formules, cartes, graphiques, TOTAL, tops, financiers, évolution) ; **valider les valeurs** sur un échantillon calculé à la main.
- [ ] **KPI-11** ⏳ Commande à 23h50 Casablanca comptée le jour « fin ».
- [x] **KPI-12** Période invalide → erreur, aucun chiffre. *(09/07)*
- [ ] **KPI-13** ⏳ CA période KPI = somme liste commandes (au centime).
- [ ] **KPI-14** 🟡 Épingles rendues ; **rejouer le clic** épingler/désépingler → section « KPI épinglés » sur `/admin`. (500 transitoire de la campagne **non reproduit** : 200/200 requêtes parallèles OK.)

## 17. Paramétrage système (CDC 6.7, 12.6)

- [ ] **PAR-01** ⏳ Identité société enregistrée et reprise dans le PDF.
- [ ] **PAR-02** ⏳ Taux TVA persisté.
- [ ] **PAR-03** ⏳ Préfixe BL : nouvelles commandes seulement.
- [x] **PAR-04** Compteur BL lecture seule = 1 003 (correct). *(09/07)*
- [ ] **PAR-05** ⏳ Upload logo : validations type/taille, renommage.
- [ ] **PAR-06** ⏳ Logo PNG/JPG dans le PDF ; note SVG affichée.
- [ ] **PAR-07** ⏳ Historique des modifications en bas d'écran.
- [x] **PAR-08** Commercial bloqué (403). *(09/07)*

## 18. Journal d'audit (CDC 6.9)

- [x] **AUD-01** Colonnes date/utilisateur/action/entité/avant-après. *(09/07)*
- [ ] **AUD-02** ⏳ Filtres + période invalide → erreur + liste vide (vérifié HTTP, confirmer au clic).
- [ ] **AUD-03** ⏳ Actions minimales toutes présentes après un parcours complet.
- [ ] **AUD-04** ⏳ Lecture seule (aucun bouton modifier/supprimer).
- [ ] **AUD-05** ⏳ Export Excel du journal filtré.

## 19. Sessions actives (CDC 6.10)

- [x] **SES-01** Liste sessions (utilisateur, rôle, IP, activité, expiration, user-agent). *(09/07)*
- [ ] **SES-02** ⏳ Déconnecter une session → utilisateur éjecté immédiatement.
- [ ] **SES-03** ⏳ Déconnecter toutes les sessions d'un utilisateur.
- [ ] **SES-04** ⏳ Désactivation de compte invalide les sessions automatiquement.
- [ ] **SES-05** ⏳ Actions auditées.

## 20. Formats & langue (CDC 13)

- [ ] **FMT-01** 🟡 Écrans parcourus en français ; balayage complet anti-résidus anglais à finir.
- [ ] **FMT-02** 🟡 Dates JJ/MM/AAAA vérifiées à l'écran (09/07/2026) ; comparer PDF/Excel.
- [ ] **FMT-03** 🟡 Montants « 51 468,00 DH » vérifiés à l'écran ; comparer PDF/Excel au centime.
- [ ] **FMT-04** ⏳ Quantités 3 décimales cohérentes partout.

## 21. Responsive & navigateurs (CDC 13)

- [ ] **RWD-01** ⏳ Mobile Chrome Android + Safari iOS : parcours commercial complet.
- [ ] **RWD-02** ⏳ Tableaux : scroll horizontal propre.
- [ ] **RWD-03** ⏳ Admin sur tablette/desktop (Chrome, Edge, Firefox).
- [ ] **RWD-04** ⏳ Aucune erreur console sur les écrans principaux.

## 22. Performance (CDC 13, 16.1)

- [x] **PERF-01** ~562 ms HTTP page 1 commandes admin (1 003 en base). *(09/07)*
- [x] **PERF-02** ~332 ms HTTP page KPI admin complète. *(09/07)*
- [ ] **PERF-03** ⏳ Taille de page 100 chronométrée.

## 23. Robustesse — matrice CDC 16.2 (obligatoire)

| # | Scénario | Attendu | Statut |
|---|---|---|---|
| R-01 | Commande sans ligne | Bloquée, aucune commande fantôme | 🟡 Vitest ; ⏳ navigateur |
| R-02 | Quantité négative / texte (DevTools) | Rejet serveur | 🟡 Vitest ; ⏳ navigateur |
| R-03 | Double-clic « Enregistrer » | 1 commande, 1 BL | ⏳ |
| R-04 | Date fin < date début (listes + KPI + exports) | Erreur, résultats vides, export 400 | ✅ *(09/07)* |
| R-05 | Session expirée en saisie longue | Redirection propre, brouillon | ⏳ |
| R-06 | Produit désactivé avec historique | Historique intact, absent des saisies | 🟡 Vitest ; ⏳ navigateur |
| R-07 | Désactivation commercial en session | Déconnexion en secondes | ⏳ |
| R-08 | URL commande d'un autre commercial | 403 sans données | ✅ *(09/07)* |
| R-09 | 2 commandes même seconde | 2 BL distincts séquentiels | 🟡 Vitest verrou ; ⏳ 2 navigateurs |
| R-10 | ~~Remise > prix de base~~ | N/A — remises retirées | N/A |
| R-11 | 12,750 kg | Identique écran/PDF/Excel | ⏳ |
| R-12 | 1 000+ lignes + filtres | Temps stable | ✅ HTTP *(09/07)* ; ⏳ perçu navigateur |

## 24. Cas limites données seed (CDC 15)

- [x] **SEED-01** Client sans commande présent en liste. *(09/07)*
- [ ] **SEED-02** 🟡 Produit désactivé en base ; confirmer badge inactif + absence des sélections.
- [ ] **SEED-03** ⏳ Commande totalement payée : « Réglée », reste 0,00 DH.
- [x] **SEED-04** Commande partielle « Non réglée ». *(09/07)*
- [ ] **SEED-05** ⏳ RELIQUAT PAYEMENT utilisable (décision KPI en attente Naomedia).

---

## Priorités de rejeu avant signature client

1. **CMD-09/10/11** — création BL réelle, double-clic, concurrence 2 onglets.
2. **PAY-02→04** — flux paiement complet jusqu'au passage « Réglée ».
3. **KPI-14 + DASHA-06** — clic épingler/désépingler de bout en bout.
4. **CLI-05** — clic réel du popup BL.
5. **SES-02 / USR-04** — déconnexion forcée vécue côté utilisateur.
6. **XLS-05** — gros export + redémarrage serveur + re-téléchargement.
7. **XLS-01/03 + PDF-03/04 + FMT** — cohérence écran = PDF = Excel au centime.
8. **RWD** — campagne Chrome mobile + Safari iOS (CDC §13, mobile-first).

## Hors périmètre de ce plan (décisions / infra)

- Décisions métier en attente : RELIQUAT PAYEMENT dans les KPI, `date_echeance`
  chèque/traite, paiement par commande vs solde global, validation formelle des
  écarts (remises retirées, paiements partiels, stack Next.js).
- Déploiement recette VPS + HTTPS (voir `docs/DEPLOYMENT.md`).
- Sauvegarde MySQL infrastructure (Naomedia).

## Traçabilité automatique

- `npm run test` → 102/102 (calculs Decimal, BL, KPI, permissions, validations Zod).
- `scripts/testplan-full.ps1` → 31 PASS / 2 PARTIAL / 1 MANUAL sur 35 checks HTTP.
