# NAOMEDIA — Brief Freelance (Technique)

## Cahier des Charges Technique & Fonctionnel — Application de Gestion Commerciale

*Spécifications complètes — Espace Commercial, Espace Administrateur, robustesse et gestion des erreurs*

| | |
|---|---|
| **Commanditaire** | Naomedia SARL — Casablanca, Maroc |
| **Projet** | Application de gestion commerciale (référence : « Poulet Étoilé ») |
| **Document** | Cahier des charges technique — Version 1.1 (édition complète) |
| **Destinataire** | Développeur freelance en charge du développement |
| **Date** | Juillet 2026 |

---

## Sommaire

1. Contexte et objectifs du projet
2. Mode de collaboration avec le freelance
3. Architecture technique imposée
4. Modèle de données — entités et relations
5. Espace Commercial — spécifications écran par écran
6. Espace Administrateur — spécifications écran par écran (complet)
7. Règles de gestion et formules de calcul
8. Utilisateurs, rôles et permissions
9. Génération de documents PDF et exports
10. Gestion des erreurs, états vides et validations
11. Intégrité des données et gestion de la concurrence
12. Sécurité applicative
13. Exigences non fonctionnelles
14. Jeu de données de référence (annexe catalogue)
15. Livrables attendus
16. Critères de recette (fonctionnels et robustesse)
17. Phasage du développement
18. Questions ouvertes à clarifier avant démarrage

---

## 1. Contexte et objectifs du projet

Naomedia développe pour un client final une application web de gestion commerciale destinée à remplacer une application existante (référence analysée : plateforme « Poulet Étoilé »). Le secteur d'activité du client est la distribution de produits avicoles (poulet et dérivés) auprès d'une clientèle de commerces (bouchers, restaurateurs, traiteurs, distributeurs).

L'application doit permettre à des commerciaux terrain de saisir des commandes, consulter leur portefeuille clients et suivre leurs performances, et à un administrateur de piloter l'ensemble de l'activité commerciale : produits, prix, utilisateurs, paramétrage système, commandes de tous les commerciaux, et indicateurs consolidés.

### Objectif de cette édition (v1.1)

Cette version complète le document initial sur deux axes demandés explicitement par Naomedia : (1) détailler intégralement l'Espace Administrateur au même niveau de précision que l'Espace Commercial (paramétrage, journal d'audit, gestion des objectifs, sécurité des sessions), et (2) spécifier la gestion des erreurs, des cas limites et de l'intégrité des données pour livrer un système robuste, sans bug ni comportement indéterminé dès la première mise en production.

Le périmètre de ce document couvre l'Espace Commercial et l'Espace Administrateur dans leur intégralité. Le module Production/Fabrication, s'il est développé, fera l'objet d'un cahier des charges complémentaire une fois les nomenclatures du client formalisées.

---

## 2. Mode de collaboration avec le freelance

| Aspect | Attendu |
|---|---|
| **Gestion de code** | Dépôt Git privé (GitHub) fourni par Naomedia. Une branche par fonctionnalité (`feature/nom-fonctionnalite`), pull request avant fusion sur `main`, revue de code par Naomedia avant merge. |
| **Suivi de tâches** | Notion (espace de travail Naomedia) — les tâches sont assignées avec critère d'acceptation ; le freelance met à jour le statut à chaque avancée. |
| **Communication** | Point d'avancement synchrone hebdomadaire (visio courte) + échanges asynchrones sur WhatsApp/Notion pour les questions bloquantes. |
| **Environnements** | Environnement de développement local (Docker recommandé) + environnement de recette sur VPS Naomedia accessible via URL de préproduction dès la fin du premier module fonctionnel. |
| **Style de code** | PSR-12 côté PHP/Laravel (via Pint ou PHP-CS-Fixer), ESLint + Prettier côté Vue/JS. Composants Vue en `<script setup>`. Noms de variables, tables et colonnes en français cohérent avec l'existant (voir section 4). |
| **Tests** | Tests unitaires Laravel (Pest ou PHPUnit) sur les règles de calcul critiques (section 7) et sur les cas limites (section 10) — obligatoires, pas optionnels. Tests end-to-end appréciés mais non bloquants pour la V1. |
| **Revue de robustesse** | Avant chaque jalon de phase (section 17), le freelance présente non seulement le fonctionnement nominal mais aussi les cas d'erreur couverts (voir checklist section 16). |

---

## 3. Architecture technique imposée

| Couche | Technologie | Précisions |
|---|---|---|
| **Backend** | Laravel 11 (PHP 8.3+) | API interne consommée par Inertia (pas de REST public séparé en V1). Authentification via Laravel Breeze/Fortify + sessions. |
| **Frontend** | Vue 3 + Inertia.js + Tailwind CSS | Composition API exclusivement. Pas de Vuex/Pinia superflu — l'état vient des props Inertia ; utiliser Pinia uniquement pour un état global réellement transverse (session utilisateur, notifications). |
| **Graphiques** | ApexCharts (vue3-apexcharts) | Utilisé pour : évolution du CA, répartition réglé/non réglé, CA par commercial (voir section 6.5). |
| **Base de données** | MySQL 8 | Charset utf8mb4, collation utf8mb4_unicode_ci (gestion correcte des accents français). Moteur InnoDB partout (support transactionnel obligatoire, voir section 11). |
| **Génération PDF** | barryvdh/laravel-dompdf (ou équivalent) | Pour les bons de livraison et exports (voir section 9). |
| **Export Excel** | maatwebsite/excel | Export des listes de commandes, rapports et exports de sauvegarde (section 6.11). |
| **Hébergement cible** | VPS Ubuntu (Hostinger), Nginx, PHP-FPM | Le freelance livre une application déployable via un script/documentation clairs ; Naomedia gère le déploiement final. |

> **Contrainte de conception importante**
> Prévoir dès le départ que le prix d'un produit est toujours fixé par l'administrateur, jamais par le commercial. Le commercial ne peut appliquer qu'un ajustement (remise ou majoration) autour de ce prix de référence, dans les limites définies en section 7. Cette règle structure tout le modèle de données des lignes de commande.

---

## 4. Modèle de données — entités et relations

Liste des tables à créer, avec leurs champs clés. Cette liste sert de base de discussion : le freelance peut proposer des ajustements mais doit les documenter dans le README du projet.

### 4.1 Utilisateurs et accès

| Table | Champs clés |
|---|---|
| **users** | id, nom_utilisateur (unique), mot_de_passe (hashé), role (enum : admin, commercial), actif (bool), derniere_connexion_at (nullable), created_at, deleted_at (soft delete) |
| **objectifs** | id, utilisateur_id, mois (format AAAA-MM), montant_objectif, created_by (admin ayant fixé l'objectif), created_at |
| **sessions** | id, user_id, ip_address, user_agent, last_activity (driver de session DB recommandé pour permettre la déconnexion forcée, voir 6.10) |

### 4.2 Produits et tarifs

| Table | Champs clés |
|---|---|
| **produits** | id, nom, categorie, unite (kg / pièce / carton), prix_reference (decimal 10,2), actif (bool), ordre_affichage, deleted_at (soft delete) |
| **historique_prix** | id, produit_id, ancien_prix, nouveau_prix, utilisateur_id (admin), created_at — traçabilité de tout changement de prix (voir 7.7) |

*Voir la section 14 pour la liste complète des produits observés dans l'application de référence (catalogue avicole), à reprendre comme jeu de données de démarrage / seeder.*

### 4.3 Clients

| Table | Champs clés |
|---|---|
| **clients** | id, nom, region_ville, telephone (nullable), commercial_id (référent), is_standard (bool — « Client standard » par défaut), deleted_at (soft delete), created_at |

### 4.4 Commandes

| Table | Champs clés |
|---|---|
| **commandes** | id, numero_bl (unique, séquentiel), client_id, client_externe_id (nullable — voir 4.6), utilisateur_id (commercial), date_commande, statut_paiement (enum : réglée / non réglée), date_reglement (nullable) |
| **lignes_commande** | id, commande_id, produit_id, quantite (decimal 10,3 — supporte les kg), prix_unitaire (copié depuis produits.prix_reference au moment de la commande), remise (decimal 10,2, DH — valeur positive = remise, valeur négative = majoration, voir 7.2), prix_net (calculé et stocké, jamais recalculé à la volée en lecture) |

> **Point de vigilance modèle**
> prix_unitaire doit être copié dans la ligne de commande au moment de la saisie, jamais recalculé depuis produits.prix_reference a posteriori. Si l'administrateur change un prix produit après coup, l'historique des commandes passées ne doit pas être affecté.

### 4.5 Retours magasin

| Table | Champs clés |
|---|---|
| **retours** | id, produit_id, quantite_kg (decimal), commentaire (texte libre, nullable), utilisateur_id, created_at (horodatage automatique) |

### 4.6 Commandes externes

L'application de référence distingue les « clients externes » et les « commandes externes » (vue séparée avec export Excel, filtrable par client externe). À clarifier avec Naomedia le sens métier exact avant implémentation (voir section 18) — hypothèse de travail : commandes passées pour le compte de clients hors portefeuille standard, ou canal de vente distinct (ex. grossiste vs détail). Prévoir une table `clients_externes` sur le même modèle que `clients`, et un champ `type_commande` (standard / externe) sur `commandes`.

### 4.7 Paramétrage et audit (nouveau)

| Table | Champs clés |
|---|---|
| **parametres_systeme** | id, cle (unique — ex. nom_societe, ice, rc, taux_tva, prefixe_numero_bl, fuseau_horaire, logo_path), valeur, updated_by, updated_at |
| **audit_log** | id, utilisateur_id, action (ex. commande.creation, produit.modification, utilisateur.desactivation), entite, entite_id, donnees_avant (JSON, nullable), donnees_apres (JSON, nullable), ip_address, created_at |

### 4.8 Diagramme relationnel simplifié

```
users (1) ──── (N) commandes ──── (N) lignes_commande ──── (N) produits
clients (1) ──── (N) commandes
users (1) ──── (N) retours ──── (N) produits
users (1) ──── (N) objectifs
users (1) ──── (N) audit_log
produits (1) ──── (N) historique_prix
```

---

## 5. Espace Commercial — spécifications écran par écran

### 5.1 Écran de connexion

- Champ « Nom d'utilisateur » et « Mot de passe » (avec bouton afficher/masquer le mot de passe).
- Message d'erreur clair si identifiants invalides ; pas d'indication sur lequel des deux champs est erroné (sécurité).
- Mention de réassurance sous le bouton (ex. « Connexion chiffrée et protégée »).
- Redirection automatique vers le tableau de bord adapté au rôle après connexion.

### 5.2 Tableau de bord commercial

Affiche, dès la connexion, les informations suivantes pour l'utilisateur connecté uniquement :

- Bandeau d'identité : « Connecté : {nom} · Rôle : COMMERCIAL ».
- Section « Ventes » avec les raccourcis : Passer une commande, Voir les commandes, Voir les commandes externes, Retours magasin, Audit KPIs.
- Carte **Chiffre d'affaire du mois** avec la période affichée (ex. « Du 01/07/2026 au 02/07/2026 »).
- Carte **Quantité du mois** (somme des quantités, toutes unités confondues).
- Carte **Chiffre d'affaire du jour** avec la date du jour affichée.
- Carte **Quantité du jour**.
- Carte **Chiffre non réglé** (montant restant dû, toutes commandes du commercial confondues) — mise en évidence visuelle (couleur d'alerte).
- Bouton de déconnexion en bas de page.

### 5.3 Nouvelle commande

Écran de saisie rapide, structuré comme suit :

1. **Sélection du client** : liste déroulante « Choisir un client » + bouton « + » pour créer un nouveau client à la volée sans quitter l'écran (modal). Une indication « Client standard » s'affiche si aucune spécificité tarifaire n'est associée au client.
2. **Ajout de produits** : bouton « + Ajouter un produit » qui insère une nouvelle ligne. Chaque ligne comprend :
   - Liste déroulante « Choisir un produit » (voir catalogue en section 14).
   - Champ Quantité (numérique, décimal autorisé pour les kg).
   - Champ Prix (DH) — pré-rempli et affiché en lecture visuelle mais modifiable uniquement via le mécanisme remise/majoration, jamais en saisie libre directe (voir règle 7.1).
   - Champ Remise (DH) avec bouton bascule « − » (remise) / « + » (majoration) — voir formule exacte en 7.2.
   - Champ « Prix net » calculé automatiquement et affiché en lecture seule (fond vert).
   - Bouton de suppression de la ligne (icône corbeille, fond rouge).
3. **Récapitulatif** (recalcul en temps réel à chaque changement de ligne) :
   - Total prix de base = somme de (quantité × prix_unitaire) sur toutes les lignes.
   - Total ajustement = somme des remises/majorations appliquées.
   - Total à payer = Total prix de base − Total ajustement (une remise réduit le total, une majoration l'augmente).
4. **Bouton « Enregistrer la commande »** (vert, pleine largeur) qui déclenche la création de la commande + toutes ses lignes en une seule transaction. Le bouton se désactive immédiatement après le premier clic (voir 10.5 anti double-soumission).

> **Comportement attendu à l'enregistrement**
> Génération automatique du numéro de bon de livraison (séquentiel, jamais choisi manuellement), horodatage de la commande, statut initial « non réglée ». La commande créée doit apparaître immédiatement dans « Voir les commandes ». Le serveur recalcule systématiquement tous les totaux à partir des lignes reçues avant d'enregistrer (voir 11.5) — jamais de confiance aveugle dans les totaux envoyés par le navigateur.

### 5.4 Voir les commandes (tableau de bord des commandes)

Écran avec trois boutons de navigation en haut (Filtres, Nouvelle, Tableau), suivi des cartes KPI identiques au tableau de bord (CA du mois, quantité du mois, CA du jour, quantité du jour, chiffre non réglé), puis :

- **Filtre rapide — Clients** : champ de recherche texte libre sur le nom du client, avec bouton « Réinitialiser Clients ».
- **Tableau des commandes**, colonnes : # (numéro de ligne), Client, Région, Date, Date règlement, Commercial, Statut (badge « Réglée » vert / « Non réglée » rouge), Montant, Actions (bouton « BL » pour générer/télécharger le bon de livraison PDF).
- **Pagination** : affichage du nombre total de commandes et du nombre de pages (ex. « Page 1 / 221 — 2204 commande(s) »), navigation Première / Précédent / Suivant / Dernière, sélecteur du nombre de lignes par page (10 / 25 / 50 / 100).
- Le tableau doit rester lisible sur mobile (scroll horizontal acceptable, en-têtes figés si possible).

### 5.5 Voir les commandes externes

Même structure que 5.4, mais filtrée sur les commandes de type « externe ». Comprend en plus :

- Filtre « Sélectionner un ou plusieurs clients externes » (multi-sélection).
- Bouton « Exporter Excel » qui génère un fichier .xlsx du tableau filtré.
- Message « Aucune commande externe trouvée » si le résultat est vide, plutôt qu'un tableau vide silencieux.

### 5.6 Retours magasin

- **Filtre par période** : Date début / Date fin (sélecteurs de date), boutons « Filtrer » et « Reset ».
- **Formulaire « Ajouter un retour »** : liste déroulante Produit (catalogue complet, voir section 14), champ Quantité (KG), champ Commentaire (texte libre, ex. « retour client X »), bouton « Enregistrer le retour ».
- Note explicite sous le formulaire : « Le retour est horodaté automatiquement et lié à votre compte » — l'horodatage et l'utilisateur ne sont donc jamais saisis manuellement.
- **Tableau historique** des retours de la période filtrée, colonnes : Date, Produit, Quantité (KG), Utilisateur, Commentaire.

### 5.7 Audit KPI's (vue commercial)

Écran d'analyse en mode « COMMERCIAL » (données personnelles uniquement) — le commercial ne voit que ses propres chiffres. Voir section 7.4 pour les formules exactes et section 6.5 pour la version consolidée admin.

---

## 6. Espace Administrateur — spécifications écran par écran (complet)

L'espace administrateur reprend toutes les fonctionnalités de l'espace commercial en mode consolidé (tous commerciaux, tous clients), plus les onze écrans/fonctions suivants qui lui sont propres. Cette section a été étendue pour couvrir l'ensemble du pilotage système, pas seulement la supervision commerciale.

### 6.1 Gestion des produits

- Liste des produits avec recherche, tri par catégorie, statut actif/inactif.
- Formulaire de création/édition : nom, catégorie, unité de vente, prix de référence (DH), statut actif.
- Gestion des catégories de produits : créer/renommer/réordonner une catégorie (ex. « Découpe », « Transformé », « Entier »).
- Le changement de prix ne doit affecter que les commandes futures (voir 4.4) et écrit une ligne dans historique_prix (voir 7.7).
- Possibilité de désactiver un produit sans le supprimer (masqué des listes déroulantes commerciales, conservé dans l'historique) — jamais de suppression physique (soft delete uniquement, voir 11.4).
- Action groupée : mise à jour de prix en masse sur une sélection de produits (ex. +5 % sur toute une catégorie), avec écran de confirmation récapitulant les changements avant application.

### 6.2 Gestion des utilisateurs (commerciaux)

- Liste des comptes avec recherche par nom, filtre par statut (actif/inactif) et par rôle.
- Création de compte : nom d'utilisateur (vérification d'unicité en temps réel), mot de passe initial généré ou saisi (règles de complexité, voir 10.6), rôle.
- Réinitialisation du mot de passe d'un commercial par l'admin (sans devoir connaître l'ancien).
- Activation / désactivation immédiate d'un compte (un commercial désactivé ne peut plus se connecter — toute session active doit être invalidée dans les secondes qui suivent, voir 6.10).
- Affichage de la date de dernière connexion par utilisateur.
- Attribution de l'objectif mensuel par commercial — renvoi vers l'écran dédié (6.8).

### 6.3 Gestion des clients (tous portefeuilles)

- Liste consolidée de tous les clients, tous commerciaux confondus, avec filtre par commercial référent et recherche par nom/région.
- Fiche client : historique complet des commandes, montant total commandé, montant réglé, montant non réglé.
- Réaffectation d'un client à un autre commercial (changement de commercial_id), avec historique de cette réaffectation conservé dans audit_log.
- Détection de doublons potentiels (noms très proches) avec suggestion de fusion manuelle validée par l'admin — la fusion doit réattribuer toutes les commandes de l'ancien client vers le client conservé avant suppression logique du doublon.
- Depuis la fiche client (voir écran 6.6), possibilité de cliquer sur un numéro de BL pour voir le détail des produits de cette commande dans une fenêtre popup.

### 6.4 Tableau de bord administrateur

Identique au tableau de bord commercial (section 5.2) mais agrégé sur l'ensemble des commerciaux, avec en plus :

- Sélecteur de commercial pour filtrer les KPI sur un seul commercial (ou « Tous »).
- Sélecteur de période personnalisée (Date début / Date fin), avec période par défaut du 1er janvier de l'année en cours à la date du jour.
- Raccourcis vers les écrans propres à l'admin : Paramétrage, Objectifs, Journal d'audit, Sessions actives.

### 6.5 Audit KPI's (vue consolidée)

Reprend la structure de l'écran commercial (5.7) en mode « ADMIN » (données de tous les commerciaux), avec les blocs suivants dans l'ordre :

1. **Filtres** : Date début, Date fin, sélecteur Commercial (« Tous » ou un commercial précis), champ Client (« Tous » ou recherche), bouton « Filtrer ».
2. **Rappel des sources de données et des formules** utilisées, affiché en petit texte sous les filtres (voir formules exactes en section 7.4) — cette transparence doit être conservée dans l'interface, elle sert de documentation vivante pour l'utilisateur.
3. **Cartes KPI** (avec icône « épingler » pour ajouter au tableau de bord principal) : CA (période), Réglé (période), Non réglé (période), Clients (nombre de clients distincts sur la période), Quantité (KG, période), Prix moyen (période).
4. **Cartes KPI cumulées** (toutes dates, selon filtres commercial/client) : CA Cumulé, Réglé Cumulé, Non réglé Cumulé.
5. **Graphique en aires** : CA par jour sur la période filtrée.
6. **Graphique en anneau (donut)** : répartition Réglé vs Non réglé.
7. **Graphique en barres** : CA par commercial.
8. **Tableau « KPI Commercial — Période »** : une ligne par commercial avec CA, Réglé, Non réglé, plus une ligne TOTAL.
9. **Bloc « Remises — par commercial »** : total des remises, ratio remises/CA, tableau par commercial (Total remise, BL avec remise, Remise moy./BL), classement « Top commercial (remise) », « Top 5 clients — Remise ».
10. **Bloc « Majorations — par commercial »** : même structure symétrique que les remises (total majorations, BL avec majoration, majoration moyenne/BL, top commercial, top 5 clients).
11. **« Top 10 Clients — CA »** : tableau Client / Qté / CA, trié décroissant.
12. **« Top 10 Produits — Qté & CA »** : tableau Produit / Qté / CA / Prix moyen, trié décroissant.
13. **« KPI Financiers — Clients (Non réglé) »** : tableau des clients ayant un impayé > 0 sur la période, colonnes Client (cliquable → détail des BL non réglés + commercial), Commercial, CA, % Non réglé. Le clic sur un numéro de BL dans le détail ouvre un popup avec les produits de la commande.
14. **« Évolution CA (Mois en cours / M-1 / M-2) »** : tableau comparatif par commercial sur les 3 derniers mois glissants.

### 6.6 Fiche client détaillée (popup / vue dédiée)

- Accessible en cliquant sur un nom de client depuis n'importe quel tableau (top clients, KPI financiers, liste clients).
- Affiche la liste des BL du client concerné avec statut réglé/non réglé et commercial associé.
- Clic sur un numéro de BL → popup avec le détail des lignes de produits de cette commande précise (produit, quantité, prix unitaire, remise, prix net).

### 6.7 Paramétrage du système (nouveau)

Écran unique regroupant toute la configuration globale, accessible uniquement à l'administrateur :

- **Identité de la société** : raison sociale, ICE, RC, IF, patente, adresse, téléphone, logo (upload image — voir validation en 12.6) — ces champs alimentent l'en-tête des PDF (section 9).
- **Paramètres fiscaux** : taux de TVA par défaut (pré-rempli à 20 %, modifiable), pour anticiper une évolution réglementaire sans redéploiement de code.
- **Numérotation** : préfixe du numéro de BL (ex. « BL-2026-»), compteur courant en lecture seule (jamais modifiable manuellement pour éviter les doublons, voir 11.2).
- **Fuseau horaire de référence** pour les calculs de dates (voir 7.4 et 11.6) — par défaut Africa/Casablanca.
- **Historique des modifications** de paramétrage visible en bas de l'écran (qui a changé quoi, quand) — alimenté par audit_log.

### 6.8 Objectifs commerciaux (nouveau)

- Tableau avec une ligne par commercial et par mois : objectif fixé, réalisé (CA réel du mois), taux d'atteinte (%), écart en DH.
- Formulaire d'édition rapide de l'objectif d'un commercial pour le mois en cours ou un mois futur (jamais de modification rétroactive d'un mois déjà clos, pour préserver la fiabilité des statistiques historiques).
- Historique des objectifs des mois précédents, en lecture seule.
- Ces données alimentent la jauge de progression déjà présente sur le tableau de bord commercial (5.2) si elle est activée.

### 6.9 Journal d'audit / historique des actions (nouveau)

- Vue tabulaire de audit_log : date/heure, utilisateur, action, entité concernée, résumé du changement (avant → après pour les champs modifiés).
- Filtres : par utilisateur, par type d'action (création / modification / suppression / connexion), par période.
- Actions à journaliser au minimum : connexion/déconnexion, création/modification/désactivation d'un compte utilisateur, création/modification/désactivation d'un produit et changement de son prix, changement de statut de règlement d'une commande, réaffectation ou fusion de client, modification du paramétrage système.
- Export du journal filtré en Excel pour analyse externe ou preuve en cas de litige.
- Le journal est en lecture seule : aucune action de suppression ou de modification d'une entrée d'audit n'est possible depuis l'interface, y compris pour l'admin.

### 6.10 Sécurité des sessions et accès (nouveau)

- Liste des sessions actives (utilisateur, date de connexion, dernière activité, adresse IP si disponible).
- Action « Déconnecter » sur une session précise, ou « Déconnecter toutes les sessions » d'un utilisateur (utile immédiatement après désactivation d'un compte ou suspicion de compte compromis).
- La désactivation d'un compte (6.2) doit invalider ses sessions actives automatiquement, sans action manuelle supplémentaire requise.

### 6.11 Export et sauvegarde des données (nouveau)

- Bouton d'export complet des tables principales (commandes, clients, produits) en Excel, pour un usage ponctuel (analyse externe, remise à l'expert-comptable).
- Ceci ne remplace pas la sauvegarde automatique de la base de données au niveau infrastructure (gérée par Naomedia côté serveur) — à mentionner clairement dans l'interface pour éviter toute confusion de responsabilité.

---

## 7. Règles de gestion et formules de calcul

*Cette section fait référence — en cas de doute sur un calcul, c'est elle qui prévaut sur toute autre interprétation visuelle des écrans.*

### 7.1 Prix produit

- Le prix d'un produit est toujours défini par l'administrateur dans la fiche produit (produits.prix_reference).
- Lors de l'ajout d'une ligne de commande, le prix affiché est copié depuis produits.prix_reference vers lignes_commande.prix_unitaire — le commercial ne peut pas taper un prix libre dans ce champ.
- Le seul levier d'ajustement du commercial est le champ Remise (voir 7.2).

### 7.2 Remise et majoration

- Un seul champ numérique « Remise (DHS) » avec une bascule visuelle « − » / « + » à côté.
- Bascule sur « − » (remise) : la valeur saisie est soustraite du prix de base pour obtenir le prix net.
- Bascule sur « + » (majoration) : la valeur saisie est ajoutée au prix de base.
- Convention de stockage recommandée en base : lignes_commande.remise stocke une valeur signée (positive = remise appliquée, négative = majoration appliquée), afin que `prix_net = (quantite × prix_unitaire) − remise` fonctionne dans les deux cas sans branche conditionnelle supplémentaire dans les rapports.
- **Prix net (ligne)** = (Quantité × Prix unitaire) − Remise signée.

### 7.3 Totaux de la commande

- **Total prix de base** = Σ (quantité × prix_unitaire) sur toutes les lignes de la commande.
- **Total ajustement** = Σ (remise signée) sur toutes les lignes.
- **Total à payer** = Total prix de base − Total ajustement = Σ (prix_net) sur toutes les lignes.

### 7.4 Formules des indicateurs (Audit KPI's)

| Indicateur | Formule |
|---|---|
| **CA (période)** | Σ (quantité × prix_unitaire) sur les commandes dont la date est dans l'intervalle [Date début 00:00, Date fin+1 00:00[ |
| **Réglé (période)** | Σ (quantité × prix_unitaire) où statut_paiement = 'réglée' |
| **Non réglé (période)** | Σ (quantité × prix_unitaire) où statut_paiement = 'non réglée' |
| **Clients (période)** | COUNT(DISTINCT client_id) sur la période filtrée |
| **Quantité (période)** | Σ (quantité) sur la période filtrée |
| **Prix moyen** | CA ÷ Quantité (sur le même périmètre de filtre) — si Quantité = 0, afficher « — » plutôt qu'une division par zéro |
| **Remise totale (par commercial)** | Σ (quantité × remise signée positive) issue de lignes_commande.remise, groupé par commercial |
| **Majoration totale (par commercial)** | Σ (quantité × \|remise signée négative\|), groupé par commercial |
| **% Non réglé (par client)** | Non réglé (client) ÷ CA (client) × 100 — si CA(client) = 0, afficher « — » |

> **Règle du filtre de dates**
> Le filtre doit être inclusif sur toute la journée de fin : `date_commande >= DU 00:00 ET date_commande < (AU + 1 jour) 00:00`, calculé dans le fuseau horaire de référence (6.7), jamais en UTC brut. Une commande passée le 2 juillet à 23h50 heure locale doit être comptée si « AU » = 2 juillet.

### 7.5 Statut de règlement

- Une commande naît toujours avec le statut « non réglée ».
- Le passage à « réglée » enregistre automatiquement date_reglement = date/heure du changement de statut, et une entrée dans audit_log.
- Aucune notion de règlement partiel en V1 (une commande est réglée ou non réglée dans sa totalité) — à confirmer, voir section 18.

### 7.6 Numérotation des bons de livraison

- Le numéro de BL est attribué automatiquement à la création de la commande, de façon séquentielle et sans trou, préfixé selon le paramétrage (6.7).
- Le numéro ne doit jamais être modifiable manuellement depuis l'interface.
- Voir 11.2 pour l'implémentation garantissant l'absence de doublon en cas de créations simultanées.

### 7.7 Historique des prix (nouveau)

- Toute modification de produits.prix_reference par l'admin crée automatiquement une ligne dans historique_prix (ancien prix, nouveau prix, auteur, date).
- Cet historique est consultable depuis la fiche produit (6.1) et n'est jamais modifiable ni supprimable.

---

## 8. Utilisateurs, rôles et permissions

| Fonctionnalité | Administrateur | Commercial |
|---|---|---|
| Connexion / déconnexion | ✔ | ✔ |
| Tableau de bord | Vue consolidée + filtre par commercial | Ses données uniquement |
| Nouvelle commande | ✔ (pour n'importe quel commercial ou en son nom) | ✔ (en son nom uniquement) |
| Voir les commandes | Toutes | Les siennes uniquement |
| Retours magasin | ✔ (tous utilisateurs) | ✔ (les siens) |
| Audit KPI's | Mode ADMIN — tous commerciaux | Mode COMMERCIAL — lui-même uniquement |
| Gestion produits & prix | ✔ | Lecture seule (catalogue) |
| Gestion utilisateurs | ✔ | — |
| Paramétrage système | ✔ | — |
| Objectifs commerciaux | ✔ (édition) | Lecture (le sien) |
| Journal d'audit | ✔ (lecture seule) | — |
| Sessions actives / sécurité | ✔ | — |
| Export Excel | ✔ (toutes données) | ✔ (ses données) |

*Implémentation recommandée : Laravel Policies ou Gates par ressource (CommandePolicy, ProduitPolicy, ParametreSystemePolicy…), avec un middleware de rôle sur les routes Inertia. Toute vérification de permission doit être faite côté serveur — masquer un bouton côté interface ne suffit jamais (voir 12.3).*

---

## 9. Génération de documents PDF et exports

### 9.1 Bon de livraison (BL)

- Généré à la demande depuis le bouton « BL » du tableau des commandes.
- Contenu minimal : numéro de BL, date, nom du client, nom du commercial, tableau des produits (désignation, quantité, prix unitaire, remise/majoration, prix net), total à payer, statut de règlement.
- En-tête avec le logo et les coordonnées de la société, tirés du paramétrage système (6.7) — jamais codés en dur dans le template.

### 9.2 Export Excel

- Colonnes identiques à celles affichées à l'écran au moment de l'export (respect des filtres actifs).
- Nom de fichier explicite : `commandes_externes_AAAA-MM-JJ.xlsx`.
- Les exports volumineux (> 5 000 lignes) doivent être générés en tâche asynchrone (queue Laravel) avec notification de disponibilité, pour ne jamais bloquer la requête HTTP ni provoquer de timeout navigateur.

---

## 10. Gestion des erreurs, états vides et validations

*Cette section est au même niveau de priorité que les spécifications fonctionnelles. Un écran qui fonctionne uniquement dans le cas nominal n'est pas considéré comme terminé.*

### 10.1 États vides (aucune donnée à afficher)

- Chaque liste (commandes, clients, produits, retours, résultats KPI) doit afficher un message explicite quand elle est vide, jamais un tableau avec juste des en-têtes de colonnes. Ex. : « Aucune commande sur cette période » plutôt qu'un espace blanc.
- Les cartes KPI sans données affichent « 0,00 DH » ou « — » selon le cas (jamais NaN, null, ou une case vide ambiguë).

### 10.2 États de chargement

- Tout appel réseau déclenché par une action utilisateur (filtrer, enregistrer, exporter) doit afficher un indicateur de chargement (spinner ou squelette) et désactiver les actions concurrentes pendant l'attente.
- Aucune donnée obsolète ne doit rester affichée sans indication visuelle pendant qu'un nouveau filtre est en cours de calcul (éviter l'ambiguïté « est-ce que ce chiffre est à jour ? »).

### 10.3 Messages d'erreur utilisateur

- Erreurs de validation de formulaire : affichées au plus près du champ concerné, en langage clair (« La quantité doit être supérieure à 0 », pas « Erreur 422 »).
- Erreurs serveur inattendues : message générique rassurant (« Une erreur est survenue, veuillez réessayer. Si le problème persiste, contactez votre administrateur. ») — jamais de trace technique brute (stack trace, requête SQL, chemin de fichier) exposée à l'utilisateur, y compris à l'admin.
- Ces erreurs techniques détaillées sont en revanche journalisées côté serveur (fichier de log Laravel) pour le débogage par le freelance/Naomedia.

### 10.4 Pages et cas d'erreur système

| Cas | Comportement attendu |
|---|---|
| **Page introuvable (404)** | Page dédiée avec lien de retour au tableau de bord, pas l'écran d'erreur par défaut du framework. |
| **Accès refusé (403)** | Page « Vous n'avez pas accès à cette ressource » — ne jamais révéler si la ressource existe mais appartient à un autre utilisateur (message identique que la ressource existe ou non). |
| **Session expirée (419 / redirection)** | Redirection propre vers l'écran de connexion avec message « Votre session a expiré, veuillez vous reconnecter » ; si possible, conserver les données d'un formulaire long en cours de saisie (ex. commande multi-lignes) pour éviter une perte de travail. |
| **Erreur serveur (500)** | Page générique rassurante, sans détail technique, avec identifiant d'erreur unique à communiquer au support si besoin. |
| **Perte de connexion réseau (mobile terrain)** | Message clair « Connexion perdue, nouvelle tentative en cours… » plutôt qu'un blocage silencieux de l'interface. |

### 10.5 Prévention de la double soumission

- Tout bouton déclenchant une écriture (enregistrer une commande, un retour, un paramètre) se désactive dès le premier clic jusqu'à la réponse du serveur.
- Ceci est une protection d'expérience utilisateur uniquement — la protection réelle contre les doublons doit être garantie côté serveur (contrainte d'unicité, transaction, voir section 11), car un double clic très rapide ou un rejeu de requête peut contourner la désactivation du bouton.

### 10.6 Règles de validation des champs

| Champ | Règle de validation (serveur, en plus du navigateur) |
|---|---|
| **Nom d'utilisateur** | Obligatoire, unique (insensible à la casse), 3 à 30 caractères, sans espace. |
| **Mot de passe** | Obligatoire, minimum 8 caractères. Recommandation : au moins une lettre et un chiffre. |
| **Quantité (ligne de commande / retour)** | Obligatoire, strictement supérieure à 0, numérique (décimales autorisées pour les kg, jusqu'à 3 décimales). |
| **Prix de référence produit** | Obligatoire, supérieur ou égal à 0, 2 décimales maximum. |
| **Remise / majoration** | Numérique, 2 décimales maximum. Le prix net résultant ne doit jamais devenir négatif — bloquer l'enregistrement avec message explicite si c'est le cas. |
| **Nom client** | Obligatoire, 2 à 100 caractères. Espaces en début/fin automatiquement supprimés (trim) avant enregistrement. |
| **Filtre Date début / Date fin** | Date fin doit être ≥ Date début ; sinon message d'erreur explicite au lieu d'un résultat vide silencieux ou d'un crash. |
| **Sélection produit / client dans une liste déroulante** | La valeur soumise doit correspondre à un enregistrement existant et actif ; rejet serveur si un identifiant invalide est reçu (protection contre une requête manipulée). |
| **Au moins une ligne de commande** | Une commande sans aucune ligne de produit ne peut pas être enregistrée — bouton « Enregistrer » désactivé tant qu'aucun produit valide n'est ajouté. |

---

## 11. Intégrité des données et gestion de la concurrence

*Plusieurs commerciaux et l'administrateur utilisent l'application simultanément. Cette section fixe les règles pour qu'aucune situation d'usage concurrent ne produise de données incohérentes.*

### 11.1 Transactions atomiques

- La création d'une commande et de l'ensemble de ses lignes doit se faire dans une seule transaction de base de données : soit tout est enregistré, soit rien ne l'est en cas d'erreur en cours de route (ex. coupure réseau après validation du client mais avant l'enregistrement de la dernière ligne).
- Même exigence pour toute opération multi-tables (ex. fusion de clients en 6.3, mise à jour de prix en masse en 6.1).

### 11.2 Numérotation concurrente du bon de livraison

- Deux commerciaux qui enregistrent une commande à la même seconde ne doivent jamais obtenir le même numéro de BL.
- Implémentation recommandée : compteur auto-incrémenté au niveau base de données (colonne AUTO_INCREMENT ou séquence dédiée avec verrou), jamais un calcul « dernier numéro + 1 » fait côté application sans verrou, qui est sujet à une condition de course.

### 11.3 Modifications concurrentes

- Si l'administrateur désactive un commercial pendant que celui-ci a une commande en cours de saisie (non encore enregistrée), la tentative d'enregistrement doit échouer proprement avec un message clair, sans corrompre de données.
- Si un produit est désactivé par l'admin pendant qu'un commercial est en train de composer une commande le contenant déjà, la commande peut être enregistrée normalement (le produit était valide au moment de l'ajout à la ligne) — c'est l'ajout d'une nouvelle ligne sur un produit désormais inactif qui doit être bloqué.

### 11.4 Suppression logique uniquement (soft delete)

- Aucune suppression physique (DELETE SQL définitif) sur : produits, clients, users, commandes, lignes_commande. Utiliser systématiquement le mécanisme deleted_at de Laravel.
- Les entités désactivées/supprimées logiquement restent visibles dans l'historique et les rapports passés, mais disparaissent des listes de sélection actives (listes déroulantes de nouvelle commande, par exemple).

### 11.5 Cohérence des totaux — recalcul serveur systématique

- Le serveur ne fait jamais confiance aux totaux calculés côté navigateur. À chaque enregistrement de commande, il recalcule intégralement Total prix de base, Total ajustement et Total à payer à partir des lignes reçues, et rejette la requête si une incohérence est détectée (ex. tentative de manipulation du total envoyé).
- Les rapports et KPI (section 7.4) sont toujours calculés à la demande depuis les tables sources, jamais depuis un total pré-stocké non vérifiable — sauf lignes_commande.prix_net qui est stocké pour figer l'historique (voir 4.4) mais dont la valeur est elle-même vérifiée à l'écriture.

### 11.6 Fuseau horaire et stockage des dates

- Toutes les dates sont stockées en base au format UTC standard.
- La conversion vers le fuseau horaire de référence (Africa/Casablanca par défaut, paramétrable en 6.7) se fait uniquement à l'affichage et dans les filtres de rapport, jamais en mélangeant les deux conventions dans une même requête.

### 11.7 Arrondis monétaires

- Tous les montants sont stockés avec 2 décimales exactes (type DECIMAL(10,2) en base — jamais FLOAT ou DOUBLE, qui introduisent des erreurs d'arrondi binaire sur les calculs financiers).
- Les quantités en kg sont stockées en DECIMAL(10,3).
- Un même montant doit s'afficher identiquement à l'écran, dans le PDF du BL et dans l'export Excel — tout écart d'arrondi entre ces trois sorties est considéré comme un bug bloquant.

---

## 12. Sécurité applicative

| Domaine | Exigence |
|---|---|
| **12.1 Authentification** | Mots de passe hashés (bcrypt ou argon2, jamais en clair ni en MD5/SHA1). Limitation du taux de tentatives de connexion (ex. 5 essais puis blocage temporaire progressif). |
| **12.2 Transport** | HTTPS obligatoire en production (HTTP redirigé), cookies de session en Secure + HttpOnly + SameSite=Lax minimum. |
| **12.3 Autorisation** | Toute vérification de rôle/permission est faite côté serveur sur chaque route et chaque action, jamais uniquement par masquage d'un bouton côté interface. Un commercial qui devine l'URL d'une commande d'un collègue doit recevoir un 403, pas les données. |
| **12.4 Injection SQL** | Exclusivement via l'ORM Eloquent ou des requêtes préparées ; aucune concaténation de chaînes SQL avec une donnée utilisateur, nulle part dans le code. |
| **12.5 XSS** | S'appuyer sur l'échappement automatique de Vue (interpolation `{{ }}`) ; interdiction d'utiliser v-html sur une donnée saisie par un utilisateur (ex. commentaire de retour, nom de client) sans sanitisation explicite. |
| **12.6 Upload de fichiers** | Le logo société (6.7) doit être validé côté serveur : type MIME restreint (PNG/JPG/SVG), taille maximale (ex. 2 Mo), renommage du fichier stocké (jamais le nom original tel quel) pour éviter toute exécution de script déguisé. |
| **12.7 Assignation de masse** | Utiliser $fillable (liste blanche) sur tous les modèles Eloquent, jamais $guarded = [], pour empêcher qu'un champ sensible (ex. role, utilisateur_id) soit modifié via une requête manipulée. |
| **12.8 Secrets** | Aucun identifiant, mot de passe ou clé (base de données, mail, etc.) commité dans le dépôt Git — uniquement via .env, exclu du contrôle de version. |

---

## 13. Exigences non fonctionnelles

| Exigence | Détail |
|---|---|
| **Langue** | Interface 100 % en français. Formats de date JJ/MM/AAAA. Nombres avec séparateur de milliers espace et virgule décimale (ex. 60 037,00 DH). |
| **Devise & fiscalité** | Dirham marocain (DH). Les montants affichés dans les écrans commerciaux analysés sont en HT ; confirmer avec Naomedia si la TVA doit apparaître explicitement dans l'espace commercial (voir section 18). Le taux est paramétrable (6.7), jamais codé en dur. |
| **Responsive** | Optimisé mobile en priorité (l'application de référence est utilisée en plein écran sur smartphone via navigateur). Le back-office administrateur doit rester utilisable sur tablette et desktop. |
| **Performance** | Le tableau des commandes gère déjà plus de 2 200 enregistrements dans l'application de référence : la pagination doit être côté serveur (jamais charger toutes les commandes en une fois côté client). Indexer date_commande, statut_paiement, client_id, utilisateur_id, numero_bl. |
| **Auditabilité** | Conserver created_at/updated_at sur toutes les tables, complété par audit_log (4.7) pour les actions sensibles. |
| **Compatibilité navigateur** | Chrome et Safari mobile en priorité (usage terrain constaté sur iPhone Safari) ; Chrome/Edge/Firefox desktop pour le back-office. |
| **Sauvegardes** | Sauvegarde automatique quotidienne de la base de données, gérée par infrastructure Naomedia au niveau serveur (hors périmètre du freelance, mais le schéma de données doit rester compatible avec une restauration simple — pas de dépendance à un état en mémoire non persisté). |

---

## 14. Jeu de données de référence (annexe catalogue)

Liste des produits observés dans le catalogue de l'application de référence, à utiliser comme seeder de démonstration pendant le développement (les prix réels seront fournis par Naomedia avant la recette) :

Abats de poulet · Ailes · Blanc · Brochettes de Poulet · Carcasse · Chawarma poulet · Coquelet · COU · Cuisse entière · Cuisse entière désossée A Peau · Cuisse entière désossée SP · Emincé de poulet · FOIE · GESIER · HDC Désossé · HDC Désossé S Peau · HDC Os & Peau · HDC Os & S Peau · KEFTA NATURE OU EPICE · Pau · Petite Viande · Pilon · POULET ENTIER · RELIQUAT PAYEMENT · SAUCISSES NATURE OU EPICE · Sot-l'y-laisse

> « HDC » = Haut De Cuisse (abréviation métier à conserver telle quelle dans le catalogue). « RELIQUAT PAYEMENT » est une ligne technique utilisée pour solder un reliquat de paiement plutôt qu'un produit physique — à traiter comme un produit normal en base, mais à signaler à Naomedia si son usage pose question comptable (voir section 18).

---

## 15. Livrables attendus

- Code source complet sur le dépôt Git Naomedia, historique de commits clair (pas de commit unique « version finale »).
- Fichier README.md : instructions d'installation locale, variables d'environnement requises, commande de seed des données de démonstration.
- Migrations Laravel versionnées pour l'ensemble du modèle de données (section 4), y compris les tables parametres_systeme, audit_log et historique_prix.
- Jeu de données de démonstration (seeders) incluant le catalogue de la section 14 et quelques clients/commandes fictifs pour tester tous les écrans, y compris des cas limites (client sans commande, produit désactivé, commande à 0 impayé, commande fortement remisée).
- Suite de tests automatisés couvrant les règles de calcul (section 7) et les cas limites listés en section 16.
- Application déployée et fonctionnelle sur l'environnement de recette Naomedia.
- Courte documentation des choix techniques non couverts explicitement par ce cahier des charges (décisions prises par le freelance, à valider a posteriori).

---

## 16. Critères de recette (fonctionnels et robustesse)

### 16.1 Recette fonctionnelle

Un module est considéré comme livré lorsque :

- Tous les écrans listés dans les sections 5 et 6 concernés sont implémentés et navigables sans erreur console.
- Les formules de la section 7 sont vérifiées manuellement sur au moins 3 cas de test (remise simple, majoration, commande multi-produits) et donnent des résultats exacts au centime près.
- La pagination du tableau des commandes reste rapide (< 1 seconde de chargement perçu) avec au moins 1 000 commandes de test en base.
- Un commercial connecté ne peut, par aucun moyen (URL directe, appel API), consulter les commandes d'un autre commercial.
- Le PDF du bon de livraison s'ouvre correctement et affiche des montants identiques à ceux de l'écran.
- L'export Excel s'ouvre sans erreur dans Excel et Google Sheets.

### 16.2 Recette de robustesse (obligatoire, à démontrer explicitement)

| Scénario testé | Résultat attendu |
|---|---|
| Enregistrer une commande sans aucune ligne de produit | Bloqué avec message clair, aucune commande fantôme créée en base |
| Saisir une quantité négative ou du texte dans un champ numérique | Rejeté côté serveur avec message explicite, même si le champ navigateur a été contourné |
| Double clic rapide sur « Enregistrer la commande » | Une seule commande créée, un seul numéro de BL consommé |
| Filtre « Date fin » antérieure à « Date début » | Message d'erreur explicite, aucun résultat incohérent ni crash |
| Session qui expire pendant une saisie longue de commande | Redirection propre vers la connexion, perte de données minimisée, pas d'écran blanc |
| Désactivation d'un produit utilisé dans d'anciennes commandes | Historique des commandes passées intact, produit disparu des nouvelles saisies uniquement |
| Désactivation d'un commercial ayant une session active | Déconnexion effective en quelques secondes, nouvelle tentative de connexion refusée |
| Accès direct par URL à une commande n'appartenant pas au commercial connecté | Réponse 403, aucune donnée exposée |
| Deux commerciaux enregistrent une commande à la même seconde | Deux numéros de BL distincts et séquentiels, aucun conflit |
| Saisie d'une remise supérieure au prix de base (prix net négatif) | Bloqué avec message explicite avant enregistrement |
| Valeurs décimales en kg (ex. 12,750 kg) | Affichage identique et cohérent à l'écran, dans le PDF et dans l'export Excel |
| Table de commandes avec 1 000+ lignes et filtres actifs | Temps de réponse stable, pas de dégradation perceptible |

---

## 17. Phasage du développement

| Phase | Contenu | Jalon de validation |
|---|---|---|
| **P1** | Socle : auth, rôles, modèle de données complet, seeders, paramétrage système (6.7), gestion produits/utilisateurs (admin) | Connexion fonctionnelle + CRUD produits/utilisateurs/paramètres démontrés |
| **P2** | Nouvelle commande + Voir les commandes (côté commercial et admin), calculs de la section 7, transactions et numérotation (section 11) | Une commande de bout en bout, calculs vérifiés, test de concurrence sur la numérotation passé |
| **P3** | Retours magasin, commandes externes, export Excel, génération PDF du BL, journal d'audit (6.9) | PDF téléchargés et vérifiés, actions journalisées visibles |
| **P4** | Audit KPI's (commercial puis consolidé admin), graphiques, tops clients/produits, objectifs commerciaux (6.8) | Tous les indicateurs de la section 7.4 vérifiés sur données réelles |
| **P5** | Gestion des erreurs et cas limites (section 10), sécurité (section 12), sessions actives (6.10), corrections, tests de charge sur la pagination, polish responsive, documentation finale | Recette complète (section 16, y compris 16.2) passée |

---

## 18. Questions ouvertes à clarifier avant démarrage

*Ces points doivent être tranchés avec Naomedia avant d'attaquer le module concerné — ne pas deviner :*

- Quelle est la différence métier exacte entre une commande « standard » et une commande « externe » ? Qui sont les « clients externes » ?
- Les montants affichés dans l'espace commercial sont-ils HT ou TTC ? La TVA doit-elle être calculée et affichée séparément quelque part ?
- Un règlement partiel (acompte) doit-il être supporté en V1, ou le statut reste-t-il binaire réglée/non réglée ?
- Le champ « région » du client est-il une liste fermée (ex. villes du Maroc) ou un texte libre ?
- La ligne catalogue « RELIQUAT PAYEMENT » doit-elle être traitée comme un produit normal dans les rapports (CA, top produits), ou exclue des KPI commerciaux ?
- Faut-il un mode hors connexion pour la saisie terrain en V1, ou cette contrainte est-elle reportée à une phase ultérieure ?
- Quel est le fuseau horaire de référence pour les filtres de dates si différent d'Africa/Casablanca ?
- Le journal d'audit (6.9) doit-il être conservé indéfiniment ou purgé après une durée donnée (volumétrie à long terme) ?
- Un administrateur peut-il lui-même passer des commandes « au nom » d'un commercial, ou uniquement consulter/superviser ?
- Existe-t-il déjà une charte graphique précise (logo haute résolution, couleurs exactes) à utiliser sur les PDF, ou faut-il la reprendre de l'application de référence ?

> **Note finale**
> Ce document reflète l'analyse d'une application de référence observée par capture d'écran, complétée par les standards de robustesse Naomedia pour tout système de gestion commerciale. Il constitue la base de travail mais n'a pas valeur contractuelle définitive tant que les questions de la section 18 ne sont pas tranchées avec Naomedia.