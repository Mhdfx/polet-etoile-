ALTER TABLE `bons_charge` ADD COLUMN `commande_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `bons_charge_commande_id_key` ON `bons_charge`(`commande_id`);

ALTER TABLE `bons_charge`
  ADD CONSTRAINT `bons_charge_commande_id_fkey`
  FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
