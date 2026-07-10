
-- AlterTable
ALTER TABLE `produits` ADD COLUMN `suivi_stock` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `bons_charge` (
    `id` VARCHAR(191) NOT NULL,
    `numero_bc` VARCHAR(40) NOT NULL,
    `numero_bc_compteur` INTEGER NOT NULL,
    `commercial_id` VARCHAR(191) NOT NULL,
    `cree_par` VARCHAR(191) NOT NULL,
    `date_charge` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentaire` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `bons_charge_numero_bc_key`(`numero_bc`),
    UNIQUE INDEX `bons_charge_numero_bc_compteur_key`(`numero_bc_compteur`),
    INDEX `bons_charge_commercial_id_date_charge_idx`(`commercial_id`, `date_charge`),
    INDEX `bons_charge_date_charge_idx`(`date_charge`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lignes_bon_charge` (
    `id` VARCHAR(191) NOT NULL,
    `bon_charge_id` VARCHAR(191) NOT NULL,
    `produit_id` VARCHAR(191) NOT NULL,
    `quantite_kg` DECIMAL(10, 3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `lignes_bon_charge_bon_charge_id_idx`(`bon_charge_id`),
    INDEX `lignes_bon_charge_produit_id_idx`(`produit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bons_charge` ADD CONSTRAINT `bons_charge_commercial_id_fkey` FOREIGN KEY (`commercial_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bons_charge` ADD CONSTRAINT `bons_charge_cree_par_fkey` FOREIGN KEY (`cree_par`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_bon_charge` ADD CONSTRAINT `lignes_bon_charge_bon_charge_id_fkey` FOREIGN KEY (`bon_charge_id`) REFERENCES `bons_charge`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_bon_charge` ADD CONSTRAINT `lignes_bon_charge_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

