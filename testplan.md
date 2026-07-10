# testplan.md — Plan de test navigateur complet (Poulet Étoilé / Naomedia)

Plan de recette manuelle à dérouler dans le navigateur pour valider **toutes** les
fonctionnalités contre `cdc.md` (recette fonctionnelle 16.1 + robustesse 16.2).

**Légende** : `[x]` = validé · `[ ]` 🟡 = partiel (préciser) · `[ ]` ⏳ = à rejouer
manuellement · ❌→✔ = échec corrigé, à re-vérifier rapidement.

---

## Résultats campagne 10/07/2026 - QA navigateur Codex (localhost:3107)

Objectif : reprise depuis zero du plan de test, puis execution navigateur reelle
sur l'instance locale ouverte dans l'in-app browser. Tests effectues avec :

- Admin : `admin` / `password`
- Commercial : `commercial.nord` / `commercial123`
- URL : `http://localhost:3107`
- Donnees creees pendant la campagne :
  - Commande admin : `PE-001004`, client `Boucherie Atlas`, produit `Abats de poulet`, quantite `12,750 kg`, total `229,50 DH`.
  - Paiement : `229,50 DH`, reference `QA-PE-001004`, statut passe a `Reglee`, reste `0,00 DH`.
  - Retour commercial : `QA retour navigateur 10/07`, `1,250 kg`, produit `Abats de poulet`.

### Synthese campagne 10/07

| Statut | Nombre | Detail |
|---|---:|---|
| **PASS navigateur** | **41** | Auth, admin navigation, dashboard commercial, commandes, paiements, audit paiement, retours, clients, parametres, sessions, objectifs, filtres invalides |
| **PARTIAL / a completer** | **13** | Mutations non destructives seulement sur produits/categories/users, audit global partiel, exports/PDF ouverts par lien mais coherence fichier non inspectee au centime |
| **MANUAL restant** | **18** | Mobile Safari/Chrome, offline reel, double-clic, deux navigateurs simultanes, gros export avec redemarrage, comparaison Excel/Google Sheets |
| **FAIL confirme app** | **0** | Aucun bug bloquant confirme par le navigateur |

### PASS navigateur confirmes 10/07

- **AUTH-01/02/03/04/07** : connexion admin, connexion commercial, erreur generique identifiants invalides, bouton afficher/masquer mot de passe, deconnexion vers `/connexion`.
- **PERM-02** : commercial sur `/admin` -> page 403, aucune donnee admin exposee.
- **ADMIN-NAV** : toutes les entrees admin chargent : accueil, produits, commandes, paiements, clients, retours, KPI, utilisateurs, objectifs, audit, sessions, parametrage, exports.
- **DASHC-01/03/04** : dashboard commercial avec cartes KPI, raccourcis cliquables, objectif mensuel visible.
- **DASHA-04 / LST-07 / AUD-02 / KPI-12** : `fin < debut` affiche une erreur explicite sans crash sur dashboard admin, commandes, audit et KPI.
- **CMD-01/03/04/05/09/12** : portefeuille client commercial isole, prix catalogue non editable, total temps reel, `12,750` kg accepte, creation BL admin `PE-001004`, brouillon restaure apres reload.
- **LST-03/05** : taille page 100 disponible, recherche BL fonctionne et retrouve `PE-001004`.
- **PAY-01/02/04/05/09** : detail commande correct, paiement complet ajoute, statut `Reglee`, reste `0,00 DH`, audit `paiement.creation`, page `/admin/paiements` OK.
- **EXT-01** : commandes externes commercial chargees avec filtre client/statut/export visible.
- **RET-01/02/03/04/07** : note CDC visible, creation retour OK, historique apres reload, pas d'edition/suppression visible, vue admin tous retours.
- **PRD-01** : produits admin, recherche et etat vide OK.
- **CLI-01/04/09** : liste clients admin + etat vide, fiche client standard, fiche client externe.
- **OBJ-01/03** : objectifs courant modifiables, mois clos en lecture seule.
- **PAR-04/07** : compteur BL lecture seule, historique parametrage visible.
- **SES-01** : sessions actives avec utilisateur, role, IP, activite, expiration, user-agent, actions.
- **XLS-07** : page `/admin/exports` affiche la mention sauvegarde infrastructure Naomedia.

### Points a corriger / ameliorer

1. **RET-02 UX mineur** : apres creation du retour, le message `Retour enregistre` apparait, mais la ligne creee n'est apparue dans l'historique qu'apres reload/navigation. Donnee bien enregistree en base. Amelioration conseillee : refresh client ou revalidation visible immediate apres succes.
2. **scripts/testplan-smoke.ps1 a fiabiliser** : la campagne de support a donne des faux echecs probables sur **PERM-04** et **PERM-06** (session/cookie incorrects), une 404 non capturee proprement et un parse `LST-09` avec `?`. Ne pas utiliser ce script seul comme preuve finale tant qu'il n'est pas corrige.
3. **DASHC-05 nuance CDC** : bouton `Deconnexion` present dans le header, pas en bas de page comme libelle CDC commercial. Fonctionnel, mais a trancher si l'emplacement exact est important.
4. **PRD-06 / PRD-08** : pages prix en masse et categories verifiees en affichage, mais pas de mutation destructive de prix/categorie appliquee pendant cette campagne.
5. **AUD-03** : paiement audite confirme. Les autres familles d'actions sensibles n'ont pas toutes ete rejouees une par une dans le navigateur pendant cette passe.

### Restes navigateur obligatoires avant signature client

- **PDF-02 -> PDF-05 + XLS-01 -> XLS-03** : ouvrir les fichiers PDF/XLSX, comparer ecran/PDF/Excel au centime, verifier logo/identite societe.
- **CMD-10/CMD-11/R-03/R-09** : double-clic et deux navigateurs simultanes pour confirmer un seul BL par commande et BL distincts en concurrence.
- **CMD-13/CMD-14/R-05** : offline reel et expiration session pendant saisie longue.
- **SES-02 -> SES-05 / USR-03/04** : deconnexion forcee vecue cote utilisateur cible.
- **RWD-01 -> RWD-04** : mobile Chrome/Safari + console propre + scroll tableaux.
- **XLS-05** : gros export, redemarrage `next start`, re-telechargement du lien.
- **CRUD navigateur complet non destructif a finir** : creation/edition produit test, categorie test, utilisateur test, client test, fusion doublon test, suppression logique test.

### Verification support 10/07

- `npm run test` : **102/102 PASS**.
- `scripts/testplan-smoke.ps1` : **12 PASS / 3 FAIL scriptables**. Les 3 echecs sont a requalifier apres correction du script, car le navigateur a confirme plusieurs permissions principales et l'app ne montre pas de fuite admin sur la session commerciale.

---

## Résultats campagne 09/07/2026 — rejeu soir (localhost:3107, build prod, base seedée)

| Statut | Nombre | Détail |
|---|---|---|
| **PASS** | **58** | Auth, permissions (dont PERM-05/07), corrections DASHA-05/RET-01/KPI-14, listes, perf, seed |
| **PARTIAL** | **14** | UI ou serveur Vitest OK, flux navigateur complet non rejoué |
| **MANUAL** | **52** | CMD navigateur, paiements, mobile/Safari, offline, concurrence, cohérence PDF/Excel |
| **FAIL** | **0** | Aucun blocant sur cette campagne |

**Automatisation rejeu :** `npm run test` → **102/102** · `scripts/testplan-full.ps1` →
**40 checks** (37 PASS, 1 PARTIAL, 1 MANUAL, 1 SKIP AUTH-03 pour rate limit).

### Validé lors du rejeu (09/07 soir)

- **DASHA-05** ✔ — raccourci « Objectifs commerciaux » → `/admin/objectifs` (HTTP + clic navigateur).
- **RET-01** ✔ — note CDC complète sous le formulaire retours (HTTP commercial).
- **DASHA-06 + KPI-14** ✔ — clic épingle CA période → section « KPI épinglés » sur `/admin`.
- **PERM-05** ✔ — Nord sur fiche `Restaurant Sud` (commercial Sud) → 403, pas de données.
- **PERM-07** ✔ — id commande réel vs bidon → même refus (403/404).
- **SEED-02** ✔ — produit désactivé visible admin (badge inactif).
- **SEED-03** ✔ — commande `seed-commande-payee` → « Réglée », reste 0.
- **KPI-STRESS** ✔ — 20 requêtes séquentielles `/admin/kpi` → 20/20 HTTP 200 (500 non reproduit).

### Corrections code (campagne matinée, re-vérifiées au rejeu)

- **DASHA-05** : lien dashboard `/admin/utilisateurs` → `/admin/objectifs`.
- **RET-01** : texte « Le retour est horodaté automatiquement et lié à votre compte. »
  dans `app/retours/retour-form.tsx`.
- **500 intermittent `/admin/kpi`** : non reproduit (cause probable : rate limit +
  reconnexions répétées du script). À surveiller ; capturer logs `next start` si reproduit.

> **Note campagnes automatisées** : le rate limit CDC 12.1 limite le **sign-in** à
> 5/min/IP. Se connecter **une fois** par campagne et réutiliser le cookie de
> session ; après un 429, attendre 60 s. Ne pas relancer les logins en boucle.
> `scripts/testplan-full.ps1` respecte cette règle (AUTH-03 en SKIP).

---

## 0. Prérequis

- Base seedée : `npm run seed` (26 produits catalogue CDC + client sans commande,
  produit désactivé, commandes payée/partielle/externe + 1 000 commandes volume).
- Build production : `npm run build` puis `npx next start -p 3107`
  (aligner `BETTER_AUTH_URL` sur le port utilisé).
- Navigateurs cibles : Chrome desktop, Chrome mobile et Safari iOS (CDC §13).
- Automatisation disponible : `npm run test` (102 Vitest) ; `scripts/testplan-full.ps1`
  (40 checks HTTP — respecter le cooldown rate limit ci-dessus).

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
- [x] **PERM-05** Fiche client d'un autre commercial (`seed-client-restaurant-sud` depuis Nord) → 403. *(09/07 rejeu)*
- [x] **PERM-06** Commercial sur `/admin/commandes/export` → refusé, pas de xlsx. *(09/07)*
- [x] **PERM-07** 403 identique id réel vs bidon (commande cross-commercial). *(09/07 rejeu)*
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
- [x] **DASHA-05** ❌→✔ Raccourci « Objectifs commerciaux » → `/admin/objectifs` (HTTP + clic navigateur). *(09/07 rejeu)*
- [x] **DASHA-06** Section « KPI épinglés » après clic épingle (voir KPI-14). *(09/07 rejeu)*

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
- [x] **LST-04** HTTP ~1395 ms par page avec 1 003 commandes (< 2,5 s serveur). *(09/07 rejeu)*
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

- [x] **RET-01** ❌→✔ Note CDC : « Le retour est horodaté automatiquement et lié à votre compte. » (HTTP + `retour-form.tsx`). *(09/07 rejeu)*
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
- [x] **KPI-14** Clic épingler CA période → section « KPI épinglés » sur `/admin` (977 755,91 DH). Désépingler à rejouer. *(09/07 rejeu)*

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

- [x] **PERF-01** ~1395 ms HTTP page 1 commandes admin (1 003 en base, < 2,5 s). *(09/07 rejeu)*
- [x] **PERF-02** ~922 ms HTTP page KPI admin complète. *(09/07 rejeu)*
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
- [x] **SEED-02** Produit désactivé : badge inactif visible admin. Absence des sélections commande : ⏳ navigateur. *(09/07 rejeu)*
- [x] **SEED-03** Commande `seed-commande-payee` : « Réglée », reste 0,00 DH. *(09/07 rejeu)*
- [x] **SEED-04** Commande partielle « Non réglée ». *(09/07)*
- [ ] **SEED-05** ⏳ RELIQUAT PAYEMENT utilisable (décision KPI en attente Naomedia).

---

## À revoir avant signature client (priorités restantes)

### Priorité haute — flux métier navigateur

1. **CMD-01→15** — nouvelle commande de bout en bout (création BL, double-clic, 2 onglets, brouillon, offline, session expirée).
2. **PAY-02→05** — ajout paiements jusqu'au passage « Réglée » + trace audit.
3. **CLI-05** — clic réel popup BL (lignes, total, statut, lien détail).
4. **SES-02 / USR-04** — déconnexion forcée vécue côté utilisateur cible.
5. **XLS-05** — gros export → redémarrer `next start` → re-télécharger le lien.

### Priorité moyenne — cohérence données & formats

6. **XLS-01/02/03 + PDF-02→05 + FMT-02→04** — écran = PDF = Excel au centime (3 commandes dont décimale).
7. **KPI-13** — CA période KPI = somme liste commandes (même filtres).
8. **KPI-11** — commande 23h50 Casablanca comptée le jour « fin ».
9. **KPI-14** — désépingler une carte (épingler validé au rejeu).
10. **AUTH-07/08** — déconnexion + retour arrière ; paire audit connexion/déconnexion.

### Priorité basse — couverture complète CDC

11. **RWD-01→04** — Chrome mobile Android + Safari iOS (CDC §13, mobile-first).
12. **DASHC-03→06, DASHA-02/04** — raccourcis, jauge objectif, filtres dashboard au clic.
13. **LST-01→03, 05→06, 08, 10** — colonnes, pagination interactive, mobile.
14. **EXT-02→04, RET-02→03/05→07, PRD-02→09, USR-01→04/06→07, CLI-01→04/06→09** — CRUD et listes au clic.
15. **PAR-01→03, 05→07, AUD-02→05, OBJ-02→05, SES-03→05** — paramétrage, audit, objectifs, sessions.
16. **R-03, R-05, R-07, R-09, R-11** — robustesse 16.2 restante (navigateur / 2 navigateurs).
17. **SEED-05** — RELIQUAT PAYEMENT (décision KPI Naomedia en attente).

### Couverture serveur déjà assurée (Vitest — ne pas re-tester sauf régression)

- Calculs commande, doublon produit, qty, produit inactif, paiement > reste, permissions 403.
- Compteur BL verrouillé, KPI, dates inclusives, formats Decimal, validations Zod produit/utilisateur.
- **PAY-03, PAY-06, CMD-06/08, RET-06, USR-05, OBJ-03, R-01/02/06/09** (partie serveur).

## Hors périmètre de ce plan (décisions / infra)

- Décisions métier en attente : RELIQUAT PAYEMENT dans les KPI, `date_echeance`
  chèque/traite, paiement par commande vs solde global, validation formelle des
  écarts (remises retirées, paiements partiels, stack Next.js).
- Déploiement recette VPS + HTTPS (voir `docs/DEPLOYMENT.md`).
- Sauvegarde MySQL infrastructure (Naomedia).

## Traçabilité automatique

- `npm run test` → **102/102** (calculs Decimal, BL, KPI, permissions, validations Zod).
- `scripts/testplan-full.ps1` → **37 PASS / 1 PARTIAL / 1 MANUAL / 1 SKIP** sur 40 checks HTTP
  (DASHA-05, RET-01, PERM-05/07, LST-09b, KPI-STRESS inclus depuis le rejeu).

Relancer :

```powershell
npm run build
npx next start -p 3107
powershell -ExecutionPolicy Bypass -File scripts/testplan-full.ps1
```

---

## Resultats campagne securite 10/07/2026 - build production localhost:3112

Revue statique complete puis smoke HTTP sur le build production durci :

- [x] Connexion admin et commercial : HTTP 200 ; espace admin accessible a l'admin.
- [x] Requete login navigateur cross-site (`Origin` externe + `Sec-Fetch-Site: cross-site`) : HTTP 403.
- [x] Script de recette sans en-tetes navigateur : login conserve, HTTP 200.
- [x] Commercial sur espace/route export admin : page 403 ou redirection 307, aucune donnee.
- [x] Job export commercial reel : createur HTTP 200 ; autre commercial HTTP 404.
- [x] PDF prive : HTTP 200 avec `Cache-Control: private, no-store`.
- [x] Route runtime d'un logo SVG : HTTP 404.
- [x] CSP, anti-framing, `nosniff` actifs et `X-Powered-By` absent.
- [x] Cookie de session non persistant quand `rememberMe=false`.
- [x] Tests securite ajoutes : IP audit, isolation exports, signatures/path logos.

Verification : Prisma OK, TypeScript OK, lint OK, build OK, **110/110 tests**.
Rapport et risques residuels : `docs/SECURITY.md`.
