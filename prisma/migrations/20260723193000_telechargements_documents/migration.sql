-- Track commercial document downloads that must be enforced server-side.
-- Admin downloads are intentionally not recorded here because they remain unlimited.

CREATE TABLE `telechargements_documents` (
  `id` VARCHAR(191) NOT NULL,
  `utilisateur_id` VARCHAR(191) NOT NULL,
  `commande_id` VARCHAR(191) NOT NULL,
  `bon_charge_id` VARCHAR(191) NULL,
  `type_document` ENUM('BL', 'FACTURE', 'BON_CHARGE') NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `telechargements_documents_bon_charge_id_type_document_key` (`bon_charge_id`, `type_document`),
  INDEX `telechargements_documents_utilisateur_id_created_at_idx` (`utilisateur_id`, `created_at`),
  INDEX `telechargements_documents_commande_id_idx` (`commande_id`),
  CONSTRAINT `telechargements_documents_utilisateur_id_fkey`
    FOREIGN KEY (`utilisateur_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `telechargements_documents_commande_id_fkey`
    FOREIGN KEY (`commande_id`) REFERENCES `commandes` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `telechargements_documents_bon_charge_id_fkey`
    FOREIGN KEY (`bon_charge_id`) REFERENCES `bons_charge` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
