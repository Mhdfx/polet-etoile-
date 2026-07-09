# Choix techniques et ecarts CDC

Ce document liste les ecarts connus entre `cdc.md` v1.1 et le code livre.

## Stack

- CDC initial : Laravel 11 + Vue 3/Inertia + MySQL.
- Code livre : Next.js 15 App Router + TypeScript strict + MySQL 8 + Prisma.
- Justification projet : derogation actee dans `CLAUDE.md`; la substance metier du CDC reste prioritaire.

## Remise / majoration

- CDC initial : champ remise/majoration et KPI associes.
- Code livre : fonctionnalite retiree par decision projet.
- Regle actuelle : `prix_net = quantite * prix_unitaire`.
- Impact : les blocs KPI remise/majoration sont marques N/A, pas implementes.

## Paiements

- CDC initial : statut binaire reglee/non reglee en V1, avec question ouverte sur les paiements partiels.
- Code livre : paiements partiels par commande via table `paiements`.
- Statut affiche : `paye` si reste du = 0, sinon `en attente`.
- Date de reglement : derivee des paiements, pas stockee sur `commandes`.

## Cheque / traite

- Code livre : `reference` optionnelle.
- Non implemente sans decision : `date_echeance`.

## RELIQUAT PAYEMENT

- Code livre : produit normal dans le catalogue et les KPI.
- Decision restante : exclusion ou traitement special si Naomedia le demande.

## Categories produits

- Code livre : champ `produits.categorie` + registre ordonne `parametres_systeme.categories_produits`.
- Pas de table `categories` dediee pour eviter une migration non validee.

## Exports volumineux

- Code livre : au-dessus de 5 000 lignes, les exports commandes/audit sont generes en job local avec URL de telechargement.
- Note production : sur plusieurs replicas, remplacer ce stockage local par un stockage partage ou une vraie queue.

