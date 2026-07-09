# testplan.md — Plan de test navigateur complet (Poulet Étoilé / Naomedia)

Plan de recette manuelle à dérouler dans le navigateur pour valider **toutes** les
fonctionnalités contre `cdc.md` (recette fonctionnelle 16.1 + robustesse 16.2).
Chaque test a un identifiant, des étapes et un résultat attendu. Cocher au fur et
à mesure.

## 0. Prérequis

- Base seedée : `npm run seed` (26 produits catalogue CDC + client sans commande,
  produit désactivé, commandes payée/partielle/externe + 1 000 commandes volume).
- Build production : `npm run build` puis `npx next start -p 3107`
  (aligner `BETTER_AUTH_URL` sur le port utilisé).
- Navigateurs cibles : Chrome desktop, Chrome mobile et Safari iOS (CDC §13).

Comptes seed :

| Rôle | Utilisateur | Mot de passe |
|---|---|---|
| Admin | `admin` | `password` |
| Commercial | `commercial.nord` | `commercial123` |
| Commercial | `commercial.sud` | `commercial123` |

---

## 1. Authentification (CDC 5.1, 12.1)

- [ ] **AUTH-01** Connexion admin valide → redirection `/admin`, bandeau « Connecté : … · Rôle ».
- [ ] **AUTH-02** Connexion commercial valide → redirection `/commercial`.
- [ ] **AUTH-03** Identifiants invalides → message d'erreur générique, **sans** préciser quel champ est faux.
- [ ] **AUTH-04** Bouton œil afficher/masquer le mot de passe fonctionne.
- [ ] **AUTH-05** Mention « Connexion chiffrée et protégée » visible sous le bouton.
- [ ] **AUTH-06** Rate limiting : 6 tentatives échouées rapides → la 6ᵉ est bloquée (HTTP 429), retenter après 1 min fonctionne.
- [ ] **AUTH-07** Déconnexion → retour `/connexion`, retour arrière navigateur ne réaffiche pas de données.
- [ ] **AUTH-08** Connexion/déconnexion journalisées dans `/admin/audit` (`auth.connexion`, `auth.deconnexion`).

## 2. Permissions serveur (CDC 8, 12.3, 16.2)

- [ ] **PERM-01** Anonyme sur `/admin`, `/commercial`, `/admin/commandes` → redirigé vers `/connexion`, aucune donnée visible.
- [ ] **PERM-02** Commercial connecté ouvre `/admin` (URL directe) → page `/403`.
- [ ] **PERM-03** Commercial Nord ouvre l'URL d'une commande de commercial.sud (`/commercial/commandes/<id>`) → `/403`, aucun montant ni n° BL exposé.
- [ ] **PERM-04** Idem sur le PDF (`/commercial/commandes/<id>/pdf`) → 403/redirection.
- [ ] **PERM-05** Commercial ouvre la fiche d'un client d'un autre commercial → `/403`.
- [ ] **PERM-06** Commercial tente `/admin/commandes/export` → refusé.
- [ ] **PERM-07** Page `/403` identique que la ressource existe ou non (ne révèle rien).
- [ ] **PERM-08** Pages 404 et 500 dédiées (pas l'écran par défaut Next), lien de retour au tableau de bord.

## 3. Tableau de bord commercial (CDC 5.2)

- [ ] **DASHC-01** Cartes : CA du mois (période affichée), Quantité du mois, CA du jour (date affichée), Quantité du jour, Chiffre non réglé (couleur alerte).
- [ ] **DASHC-02** Les chiffres ne concernent QUE le commercial connecté (comparer nord vs sud).
- [ ] **DASHC-03** Raccourcis Ventes : Passer une commande, Voir les commandes, Commandes externes, Retours, KPI — tous cliquables.
- [ ] **DASHC-04** Jauge objectif mensuel visible si un objectif est défini.
- [ ] **DASHC-05** Bouton de déconnexion présent en bas de page.
- [ ] **DASHC-06** Sans données (nouveau commercial) : cartes affichent « 0,00 DH » / « — », jamais NaN.

## 4. Tableau de bord admin (CDC 6.4)

- [ ] **DASHA-01** Cartes identiques au commercial mais consolidées (tous commerciaux).
- [ ] **DASHA-02** Sélecteur de commercial filtre les KPI (choisir nord → chiffres de nord uniquement).
- [ ] **DASHA-03** Période personnalisée par défaut : 1er janvier → aujourd'hui.
- [ ] **DASHA-04** Filtre `Date fin < Date début` → message d'erreur explicite, pas de crash ni chiffres trompeurs.
- [ ] **DASHA-05** Raccourcis : Paramétrage, Objectifs, Journal d'audit, Sessions actives présents.
- [ ] **DASHA-06** Section « KPI épinglés » apparaît quand des cartes sont épinglées depuis `/admin/kpi` (voir KPI-14).

## 5. Nouvelle commande (CDC 5.3, 7.1, 7.3, 10.5, 10.6, 11)

- [ ] **CMD-01** Liste déroulante clients : uniquement les clients actifs du commercial connecté.
- [ ] **CMD-02** Bouton « + » crée un client à la volée (modal) sans quitter l'écran ; le nouveau client est sélectionnable immédiatement.
- [ ] **CMD-03** Ajout de lignes produit : le prix vient du catalogue, **non modifiable** en saisie libre (aucun champ prix éditable).
- [ ] **CMD-04** Prix net ligne = quantité × prix unitaire, recalculé en temps réel ; total commande = somme des lignes.
- [ ] **CMD-05** Quantité décimale acceptée (ex. `12,750` kg) ; quantité 0 ou négative → erreur près du champ (« La quantité doit être supérieure à 0 »).
- [ ] **CMD-06** Produit désactivé absent de la liste déroulante.
- [ ] **CMD-07** Commande sans aucune ligne → enregistrement bloqué avec message clair, aucune commande fantôme en base.
- [ ] **CMD-08** Même produit deux fois → rejeté avec message.
- [ ] **CMD-09** Enregistrer → n° BL séquentiel affiché (préfixe paramétré), statut initial « Non réglée », commande visible immédiatement dans « Voir les commandes ».
- [ ] **CMD-10** Double-clic rapide sur « Enregistrer » → **une seule** commande créée, un seul n° BL consommé (vérifier en base/liste).
- [ ] **CMD-11** Deux onglets (nord + sud) enregistrent quasi simultanément → deux n° BL distincts et séquentiels.
- [ ] **CMD-12** Brouillon : remplir le formulaire, recharger la page → client/lignes restaurés.
- [ ] **CMD-13** Couper le réseau (DevTools offline) → message clair, bouton bloqué ; retour réseau → soumission possible.
- [ ] **CMD-14** Session expirée pendant la saisie → redirection propre vers connexion, pas d'écran blanc ; brouillon restauré après reconnexion.
- [ ] **CMD-15** Admin peut passer une commande au nom d'un commercial (sélecteur) et une commande externe ; l'action est auditée.

## 6. Listes de commandes (CDC 5.4, 13, 16.1)

- [ ] **LST-01** Colonnes : Client, Région, Date, Date règlement, Commercial (admin), Statut badge « Réglée » vert / « Non réglée » rouge, Montant, bouton BL.
- [ ] **LST-02** Pagination serveur : total et nombre de pages affichés, navigation Première/Précédente/Suivante/Dernière.
- [ ] **LST-03** Sélecteur 10 / 25 / 50 / 100 lignes par page.
- [ ] **LST-04** Chargement < 1 s par page avec les 1 000+ commandes seed (chronométrer).
- [ ] **LST-05** Recherche client/BL filtre correctement ; bouton réinitialiser.
- [ ] **LST-06** Filtres statut (Réglée / Non réglée), commercial et type (admin) combinables.
- [ ] **LST-07** Période invalide (`fin < début`) → message d'erreur **et liste vide** (pas de résultats non filtrés).
- [ ] **LST-08** Aucun résultat → « Aucune commande… », jamais un tableau vide silencieux.
- [ ] **LST-09** Le commercial ne voit que ses commandes ; l'admin voit tout.
- [ ] **LST-10** Lisible sur mobile (scroll horizontal acceptable).

## 7. Commandes externes (CDC 5.5)

- [ ] **EXT-01** Vue filtrée sur le type externe uniquement.
- [ ] **EXT-02** Filtre multi-sélection de clients externes.
- [ ] **EXT-03** Bouton « Exporter Excel » → fichier du tableau **filtré**, nom `commandes_externes_AAAA-MM-JJ.xlsx`.
- [ ] **EXT-04** Résultat vide → « Aucune commande externe trouvée ».

## 8. Détail commande & paiements (CDC 7.5, règles projet)

- [ ] **PAY-01** Détail commande : lignes figées (produit, quantité, prix unitaire, prix net), total, payé, reste dû.
- [ ] **PAY-02** Admin ajoute un paiement (espèces / chèque / traite / autre, référence optionnelle) → reste dû recalculé.
- [ ] **PAY-03** Paiement > reste dû → refusé avec message.
- [ ] **PAY-04** Plusieurs paiements partiels : statut passe à « Réglée » exactement quand reste dû = 0 ; date règlement dérivée du dernier paiement.
- [ ] **PAY-05** Paiement audité dans `/admin/audit`.
- [ ] **PAY-06** Commercial ne voit pas le formulaire de paiement et ne peut pas payer via requête directe.
- [ ] **PAY-07** Commande figée : aucun écran d'édition de lignes après création.
- [ ] **PAY-08** Suppression commande : admin uniquement, soft delete, disparaît des listes, tracée dans l'audit.
- [ ] **PAY-09** Page `/admin/paiements` : commandes à encaisser, filtres BL/client/commercial/statut, KPI encaissement, historique récent.

## 9. PDF Bon de livraison (CDC 9.1, 11.7)

- [ ] **PDF-01** Bouton BL depuis la liste → PDF s'ouvre : n° BL, date, client, commercial, tableau produits (désignation, quantité, prix unitaire, prix net), total, **statut de règlement**.
- [ ] **PDF-02** En-tête : raison sociale, ICE, RC issus du paramétrage (jamais codés en dur) + **logo** si un PNG/JPG est téléversé.
- [ ] **PDF-03** Montants du PDF **identiques au centime** à ceux de l'écran.
- [ ] **PDF-04** Quantités décimales identiques écran/PDF (ex. 12,750 kg).
- [ ] **PDF-05** Modifier le prix catalogue d'un produit, re-générer le PDF d'une ancienne commande → montants inchangés (prix figés).

## 10. Exports Excel (CDC 9.2, 6.11, 11.7)

- [ ] **XLS-01** Export commandes (admin + commercial) : s'ouvre dans Excel **et** Google Sheets sans erreur.
- [ ] **XLS-02** Colonnes conformes à l'écran, filtres actifs respectés, statut « Réglée / Non réglée ».
- [ ] **XLS-03** Montants identiques au centime écran = PDF = Excel sur 3 commandes échantillon (dont une à quantité décimale).
- [ ] **XLS-04** Période invalide dans l'URL d'export → HTTP 400 avec message, pas un export non filtré.
- [ ] **XLS-05** Export volumineux (> 5 000 lignes) → job asynchrone : lien renvoyé, « en cours » puis téléchargement ; le job **survit à un redémarrage** du serveur.
- [ ] **XLS-06** Le fichier généré n'est PAS téléchargeable sans être connecté (URL directe anonyme → refus).
- [ ] **XLS-07** `/admin/exports` : exports globaux commandes/clients/clients externes/produits + mention « ne remplace pas la sauvegarde infrastructure ».
- [ ] **XLS-08** Export audit filtré (CDC 6.9) fonctionne.

## 11. Retours magasin (CDC 5.6)

- [ ] **RET-01** Formulaire : produit (catalogue complet actif), quantité KG, commentaire libre ; note « horodaté automatiquement et lié à votre compte ».
- [ ] **RET-02** Création → horodatage auto, rattaché au commercial connecté, audité.
- [ ] **RET-03** Retour non modifiable après saisie (aucun bouton d'édition/suppression).
- [ ] **RET-04** Filtre période Date début / Date fin + boutons Filtrer et Reset.
- [ ] **RET-05** Période invalide → message d'erreur + liste vide.
- [ ] **RET-06** Quantité ≤ 0 ou texte → rejet serveur avec message clair.
- [ ] **RET-07** Vue admin : tous les retours, colonne commercial, même filtre période.

## 12. Produits & catégories (CDC 6.1, 7.7)

- [ ] **PRD-01** Liste avec recherche, tri, statut actif/inactif, pagination serveur.
- [ ] **PRD-02** Création : nom, catégorie, unité, prix référence ; doublon de nom actif refusé.
- [ ] **PRD-03** Prix négatif ou > 2 décimales → rejeté.
- [ ] **PRD-04** Changement de prix → ligne dans l'historique des prix (ancien, nouveau, auteur, date), consultable depuis la fiche, non modifiable.
- [ ] **PRD-05** Changement de prix ne modifie AUCUNE commande passée.
- [ ] **PRD-06** Mise à jour de prix en masse (% sur catégorie) avec écran de confirmation ; erreur au milieu du lot → rollback complet.
- [ ] **PRD-07** Désactivation d'un produit : disparaît des nouvelles commandes, historique intact ; réactivation possible ; jamais de suppression physique.
- [ ] **PRD-08** Catégories : créer / renommer / réordonner ; catégories cohérentes (accents « Découpe », « Élaboré »).
- [ ] **PRD-09** Toutes les actions produits sont auditées.

## 13. Utilisateurs (CDC 6.2, 10.6)

- [ ] **USR-01** Liste avec recherche, filtre statut/rôle, date de dernière connexion affichée.
- [ ] **USR-02** Création : nom utilisateur 3–30 caractères sans espace, unicité (y compris vs comptes supprimés), mot de passe ≥ 8 caractères.
- [ ] **USR-03** Réinitialisation du mot de passe par l'admin sans connaître l'ancien ; les sessions de l'utilisateur sont invalidées.
- [ ] **USR-04** Désactivation d'un compte avec session active → **déconnecté en quelques secondes** (recharger sa page → /connexion), reconnexion refusée.
- [ ] **USR-05** Impossible de désactiver/supprimer son propre compte ou le dernier admin actif.
- [ ] **USR-06** Suppression logique : l'utilisateur disparaît des listes actives, son historique de commandes reste.
- [ ] **USR-07** Toutes les actions auditées.

## 14. Clients & fiches (CDC 6.3, 6.6, 10.6)

- [ ] **CLI-01** Admin : liste consolidée, filtre par commercial référent, recherche nom/région, pagination.
- [ ] **CLI-02** Commercial : uniquement son portefeuille ; CRUD sur ses clients seulement.
- [ ] **CLI-03** Création : nom 2–100 caractères (trim automatique), ville depuis la liste fermée Maroc, téléphone optionnel.
- [ ] **CLI-04** Fiche client : totaux commandé / réglé / non réglé + liste des BL avec statut et commercial.
- [ ] **CLI-05** **Clic sur un n° BL dans la fiche → popup** avec les lignes produits (produit, quantité, prix unitaire, prix net), total, statut, lien vers le détail complet.
- [ ] **CLI-06** Réaffectation d'un client à un autre commercial → auditée ; l'ancien commercial perd l'accès.
- [ ] **CLI-07** Détection de doublons (noms proches) + fusion : toutes les commandes réattribuées au client conservé, doublon soft-deleted, transaction atomique, audit `client.fusion`.
- [ ] **CLI-08** Suppression logique : client disparaît des listes de sélection, historique conservé.
- [ ] **CLI-09** Clients externes : mêmes vérifications (CRUD admin, fiche, popup BL).

## 15. Objectifs commerciaux (CDC 6.8)

- [ ] **OBJ-01** `/admin/objectifs` : une ligne par commercial pour le mois choisi — objectif, réalisé (CA), taux %, écart DH, ligne TOTAL.
- [ ] **OBJ-02** Édition rapide inline pour le mois courant/futur ; la valeur enregistrée se reflète immédiatement.
- [ ] **OBJ-03** Mois passé → lecture seule (« Voir l'historique ») ; tentative de modification d'un mois clos rejetée côté serveur.
- [ ] **OBJ-04** Historique par commercial sous `/admin/utilisateurs/<id>/objectifs`.
- [ ] **OBJ-05** La jauge du tableau de bord commercial reflète l'objectif du mois.

## 16. Audit KPI's (CDC 5.7, 6.5, 7.4)

- [ ] **KPI-01** Commercial : ses chiffres uniquement (ventes, quantité mois/jour, impayés, objectif, top clients, top produits).
- [ ] **KPI-02** Admin : filtres Date début/fin, Commercial (« Tous » ou un), Client (« Tous » ou un), bouton Filtrer.
- [ ] **KPI-03** Rappel des formules affiché sous les filtres.
- [ ] **KPI-04** Cartes période : CA, Réglé, Non réglé, Clients distincts, Quantité KG, Prix moyen (« — » si quantité 0).
- [ ] **KPI-05** Cartes cumulées : CA / Réglé / Non réglé cumulés (toutes dates, filtres respectés).
- [ ] **KPI-06** Graphique aires CA par jour, donut Réglé vs Non réglé, barres CA par commercial.
- [ ] **KPI-07** Tableau KPI Commercial avec ligne TOTAL ; TOTAL = somme exacte des lignes.
- [ ] **KPI-08** Top 10 clients (Qté/CA) et Top 10 produits (Qté/CA/prix moyen) triés décroissant ; noms cliquables → fiche.
- [ ] **KPI-09** KPI financiers clients non réglés : % non réglé correct, « — » si CA = 0 ; client cliquable → fiche → popup BL.
- [ ] **KPI-10** Évolution CA mois courant / M-1 / M-2 par commercial.
- [ ] **KPI-11** Filtre de dates inclusif : une commande passée à 23h50 heure Casablanca le jour « fin » est comptée.
- [ ] **KPI-12** Période invalide → message d'erreur, **aucun chiffre affiché**.
- [ ] **KPI-13** Vérification croisée : CA période KPI = somme des montants de la liste des commandes sur la même période (au centime).
- [ ] **KPI-14** **Épingler** : cliquer l'épingle d'une carte → elle apparaît dans « KPI épinglés » sur `/admin`; re-cliquer → elle disparaît.

## 17. Paramétrage système (CDC 6.7, 12.6)

- [ ] **PAR-01** Identité société : raison sociale, ICE, RC, IF, patente, adresse, téléphone — enregistrés et repris dans l'en-tête PDF.
- [ ] **PAR-02** Taux TVA paramétrable (non appliqué en V1) ; valeur persistée.
- [ ] **PAR-03** Préfixe BL modifiable → prochaine commande utilise le nouveau préfixe ; anciennes inchangées.
- [ ] **PAR-04** Compteur BL courant en **lecture seule** et correct (= nombre réel de BL émis).
- [ ] **PAR-05** Upload logo : PNG/JPG/SVG ≤ 2 Mo accepté, fichier renommé ; > 2 Mo ou autre type → refusé avec message.
- [ ] **PAR-06** Logo PNG/JPG apparaît dans le PDF ; note UI expliquant que le SVG n'apparaît pas dans le PDF.
- [ ] **PAR-07** Historique des modifications de paramétrage visible en bas d'écran.
- [ ] **PAR-08** Écran inaccessible au commercial (403).

## 18. Journal d'audit (CDC 6.9)

- [ ] **AUD-01** Colonnes : date/heure, utilisateur, action, entité, aperçu avant → après.
- [ ] **AUD-02** Filtres utilisateur / action / entité / période fonctionnels ; période invalide → erreur + liste vide.
- [ ] **AUD-03** Actions minimales présentes : connexion/déconnexion, utilisateur créé/modifié/désactivé, produit + prix, paiement/statut commande, réaffectation/fusion client, paramétrage.
- [ ] **AUD-04** Journal en lecture seule : aucune action de modification/suppression dans l'UI.
- [ ] **AUD-05** Export Excel du journal filtré.

## 19. Sessions actives (CDC 6.10)

- [ ] **SES-01** Liste : utilisateur, rôle, IP, dernière activité, expiration, user-agent.
- [ ] **SES-02** « Déconnecter » une session → l'utilisateur concerné est déconnecté immédiatement (sa prochaine navigation → /connexion).
- [ ] **SES-03** « Déconnecter toutes les sessions » d'un utilisateur fonctionne.
- [ ] **SES-04** Désactiver un compte (écran utilisateurs) invalide ses sessions automatiquement.
- [ ] **SES-05** Actions auditées.

## 20. Formats & langue (CDC 13)

- [ ] **FMT-01** Interface 100 % français sur tous les écrans (aucun texte anglais résiduel).
- [ ] **FMT-02** Dates JJ/MM/AAAA partout (écran, PDF, Excel).
- [ ] **FMT-03** Montants « 60 037,00 DH » : espace milliers, virgule décimale — écran, PDF, Excel identiques.
- [ ] **FMT-04** Quantités kg à 3 décimales cohérentes partout.

## 21. Responsive & navigateurs (CDC 13)

- [ ] **RWD-01** Espace commercial utilisable sur mobile (Chrome Android + Safari iOS) : connexion, dashboard, nouvelle commande de bout en bout, liste commandes, retours.
- [ ] **RWD-02** Tableaux : scroll horizontal propre, pas de débordement de page.
- [ ] **RWD-03** Back-office admin utilisable sur tablette/desktop (Chrome, Edge, Firefox).
- [ ] **RWD-04** Aucune erreur console sur les écrans principaux.

## 22. Performance (CDC 13, 16.1)

- [ ] **PERF-01** Liste commandes admin < 1 s perçu par page avec 1 000+ commandes (tester pages 1, milieu, dernière, avec filtres).
- [ ] **PERF-02** Page KPI admin complète < 2 s avec le volume seed.
- [ ] **PERF-03** Changement de taille de page (100 lignes) reste fluide.

## 23. Robustesse — matrice CDC 16.2 (obligatoire)

| # | Scénario | Attendu | OK |
|---|---|---|---|
| R-01 | Commande sans ligne | Bloquée, message clair, aucune commande en base | [ ] |
| R-02 | Quantité négative / texte (contourner le navigateur via DevTools) | Rejet **serveur** avec message | [ ] |
| R-03 | Double-clic « Enregistrer la commande » | 1 seule commande, 1 seul n° BL | [ ] |
| R-04 | Date fin < date début (toutes les listes + KPI + exports) | Message explicite, résultats vides, export 400, pas de crash | [ ] |
| R-05 | Session expirée pendant une saisie longue | Redirection propre, brouillon restauré, pas d'écran blanc | [ ] |
| R-06 | Désactivation d'un produit utilisé dans d'anciennes commandes | Historique intact, produit absent des nouvelles saisies | [ ] |
| R-07 | Désactivation d'un commercial avec session active | Déconnexion en quelques secondes, reconnexion refusée | [ ] |
| R-08 | URL directe vers la commande d'un autre commercial | 403, aucune donnée | [ ] |
| R-09 | Deux commandes à la même seconde (2 navigateurs) | 2 n° BL distincts séquentiels | [ ] |
| R-10 | ~~Remise > prix de base~~ | N/A — remises retirées (décision projet) | N/A |
| R-11 | 12,750 kg | Identique écran / PDF / Excel | [ ] |
| R-12 | 1 000+ lignes + filtres actifs | Temps stable, pas de dégradation | [ ] |

## 24. Cas limites données seed (CDC 15)

- [ ] **SEED-01** Client sans commande : fiche s'affiche avec « Aucun BL », totaux à 0.
- [ ] **SEED-02** Produit désactivé : visible dans l'admin (inactif), absent des sélections.
- [ ] **SEED-03** Commande totalement payée : statut « Réglée », reste dû 0,00 DH.
- [ ] **SEED-04** Commande partiellement payée : « Non réglée », reste dû correct.
- [ ] **SEED-05** « RELIQUAT PAYEMENT » utilisable comme produit normal (décision KPI en attente Naomedia).

---

## Hors périmètre de ce plan (décisions / infra)

- Décisions métier en attente : RELIQUAT PAYEMENT dans les KPI, `date_echeance`
  chèque/traite, paiement par commande vs solde global, validation formelle des
  écarts (remises retirées, paiements partiels, stack Next.js).
- Déploiement recette VPS + HTTPS (voir `docs/DEPLOYMENT.md`).
- Sauvegarde MySQL infrastructure (Naomedia).

## Traçabilité automatique

Complément à ce plan manuel : `npm run test` (102 tests Vitest) couvre calculs
Decimal, KPI, permissions serveur, compteur BL transactionnel, validations Zod.
