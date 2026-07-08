-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `nom_utilisateur` VARCHAR(100) NOT NULL,
    `mot_de_passe_hash` VARCHAR(255) NOT NULL,
    `nom_complet` VARCHAR(160) NOT NULL,
    `role` ENUM('ADMIN', 'COMMERCIAL') NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `derniere_connexion_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_nom_utilisateur_key`(`nom_utilisateur`),
    INDEX `users_role_actif_idx`(`role`, `actif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `objectifs` (
    `id` VARCHAR(191) NOT NULL,
    `utilisateur_id` VARCHAR(191) NOT NULL,
    `mois` CHAR(7) NOT NULL,
    `montant_objectif` DECIMAL(10, 2) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `objectifs_mois_idx`(`mois`),
    UNIQUE INDEX `objectifs_utilisateur_id_mois_key`(`utilisateur_id`, `mois`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produits` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(180) NOT NULL,
    `categorie` VARCHAR(120) NOT NULL,
    `unite` VARCHAR(10) NOT NULL DEFAULT 'kg',
    `prix_reference` DECIMAL(10, 2) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `ordre_affichage` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `produits_actif_ordre_affichage_idx`(`actif`, `ordre_affichage`),
    INDEX `produits_categorie_idx`(`categorie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historique_prix` (
    `id` VARCHAR(191) NOT NULL,
    `produit_id` VARCHAR(191) NOT NULL,
    `ancien_prix` DECIMAL(10, 2) NOT NULL,
    `nouveau_prix` DECIMAL(10, 2) NOT NULL,
    `utilisateur_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `historique_prix_produit_id_date_idx`(`produit_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(180) NOT NULL,
    `region_ville` VARCHAR(120) NOT NULL,
    `telephone` VARCHAR(40) NULL,
    `commercial_id` VARCHAR(191) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `clients_commercial_id_actif_idx`(`commercial_id`, `actif`),
    INDEX `clients_region_ville_idx`(`region_ville`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients_externes` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(180) NOT NULL,
    `region_ville` VARCHAR(120) NOT NULL,
    `telephone` VARCHAR(40) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `clients_externes_actif_idx`(`actif`),
    INDEX `clients_externes_region_ville_idx`(`region_ville`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commandes` (
    `id` VARCHAR(191) NOT NULL,
    `numero_bl` VARCHAR(40) NOT NULL,
    `numero_bl_compteur` INTEGER NOT NULL,
    `client_id` VARCHAR(191) NULL,
    `client_externe_id` VARCHAR(191) NULL,
    `utilisateur_id` VARCHAR(191) NOT NULL,
    `date_commande` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type_commande` ENUM('STANDARD', 'EXTERNE') NOT NULL DEFAULT 'STANDARD',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `commandes_numero_bl_key`(`numero_bl`),
    UNIQUE INDEX `commandes_numero_bl_compteur_key`(`numero_bl_compteur`),
    INDEX `commandes_utilisateur_id_date_commande_idx`(`utilisateur_id`, `date_commande`),
    INDEX `commandes_client_id_idx`(`client_id`),
    INDEX `commandes_client_externe_id_idx`(`client_externe_id`),
    INDEX `commandes_type_commande_date_commande_idx`(`type_commande`, `date_commande`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lignes_commande` (
    `id` VARCHAR(191) NOT NULL,
    `commande_id` VARCHAR(191) NOT NULL,
    `produit_id` VARCHAR(191) NOT NULL,
    `quantite` DECIMAL(10, 3) NOT NULL,
    `prix_unitaire` DECIMAL(10, 2) NOT NULL,
    `prix_net` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `lignes_commande_commande_id_idx`(`commande_id`),
    INDEX `lignes_commande_produit_id_idx`(`produit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paiements` (
    `id` VARCHAR(191) NOT NULL,
    `commande_id` VARCHAR(191) NOT NULL,
    `montant` DECIMAL(10, 2) NOT NULL,
    `mode_paiement` ENUM('ESPECES', 'CHEQUE', 'TRAITE', 'AUTRE') NOT NULL,
    `date_paiement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(120) NULL,
    `encaisse_par` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `paiements_commande_id_date_paiement_idx`(`commande_id`, `date_paiement`),
    INDEX `paiements_encaisse_par_idx`(`encaisse_par`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retours` (
    `id` VARCHAR(191) NOT NULL,
    `produit_id` VARCHAR(191) NOT NULL,
    `quantite_kg` DECIMAL(10, 3) NOT NULL,
    `commentaire` TEXT NULL,
    `utilisateur_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `retours_utilisateur_id_created_at_idx`(`utilisateur_id`, `created_at`),
    INDEX `retours_produit_id_idx`(`produit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parametres_systeme` (
    `id` VARCHAR(191) NOT NULL,
    `cle` VARCHAR(120) NOT NULL,
    `valeur` TEXT NOT NULL,
    `updated_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parametres_systeme_cle_key`(`cle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `utilisateur_id` VARCHAR(191) NULL,
    `action` VARCHAR(120) NOT NULL,
    `entite` VARCHAR(120) NOT NULL,
    `entite_id` VARCHAR(120) NULL,
    `donnees_avant` JSON NULL,
    `donnees_apres` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_utilisateur_id_created_at_idx`(`utilisateur_id`, `created_at`),
    INDEX `audit_log_entite_entite_id_idx`(`entite`, `entite_id`),
    INDEX `audit_log_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compteurs_bl` (
    `cle` VARCHAR(40) NOT NULL,
    `valeur` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the transaction-locked BL counter used for gapless MySQL BL numbering.
INSERT INTO `compteurs_bl` (`cle`, `valeur`, `updated_at`) VALUES ('numero_bl', 0, CURRENT_TIMESTAMP(3));

-- AddForeignKey
ALTER TABLE `objectifs` ADD CONSTRAINT `objectifs_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objectifs` ADD CONSTRAINT `objectifs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historique_prix` ADD CONSTRAINT `historique_prix_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historique_prix` ADD CONSTRAINT `historique_prix_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_commercial_id_fkey` FOREIGN KEY (`commercial_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commandes` ADD CONSTRAINT `commandes_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commandes` ADD CONSTRAINT `commandes_client_externe_id_fkey` FOREIGN KEY (`client_externe_id`) REFERENCES `clients_externes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commandes` ADD CONSTRAINT `commandes_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_commande` ADD CONSTRAINT `lignes_commande_commande_id_fkey` FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_commande` ADD CONSTRAINT `lignes_commande_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paiements` ADD CONSTRAINT `paiements_commande_id_fkey` FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paiements` ADD CONSTRAINT `paiements_encaisse_par_fkey` FOREIGN KEY (`encaisse_par`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retours` ADD CONSTRAINT `retours_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retours` ADD CONSTRAINT `retours_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parametres_systeme` ADD CONSTRAINT `parametres_systeme_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
