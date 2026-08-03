ALTER TABLE `commandes`
  ADD COLUMN `numero_facture` VARCHAR(40) NULL,
  ADD COLUMN `numero_facture_compteur` INTEGER NULL;

UPDATE `commandes`
SET
  `numero_facture_compteur` = `numero_bl_compteur`,
  `numero_facture` = CONCAT('FACT-', LPAD(`numero_bl_compteur`, 6, '0'));

ALTER TABLE `commandes`
  MODIFY `numero_facture` VARCHAR(40) NOT NULL,
  MODIFY `numero_facture_compteur` INTEGER NOT NULL,
  ADD UNIQUE INDEX `commandes_numero_facture_key` (`numero_facture`),
  ADD UNIQUE INDEX `commandes_numero_facture_compteur_key` (`numero_facture_compteur`);

INSERT INTO `compteurs_bl` (`cle`, `valeur`, `updated_at`)
SELECT 'numero_facture', COALESCE(MAX(`numero_facture_compteur`), 0), NOW(3)
FROM `commandes`
ON DUPLICATE KEY UPDATE
  `valeur` = GREATEST(`valeur`, VALUES(`valeur`)),
  `updated_at` = NOW(3);

INSERT INTO `parametres_systeme` (`id`, `cle`, `valeur`, `updated_at`)
VALUES (CONCAT('param-', UUID()), 'prefixe_facture', 'FACT', NOW(3))
ON DUPLICATE KEY UPDATE `valeur` = `valeur`;

-- Nettoie d'eventuels doublons historiques avant d'imposer l'unicite par commande.
DELETE t1 FROM `telechargements_documents` t1
INNER JOIN `telechargements_documents` t2
  ON t1.`commande_id` = t2.`commande_id`
 AND t1.`type_document` = t2.`type_document`
 AND (
   t1.`created_at` > t2.`created_at`
   OR (t1.`created_at` = t2.`created_at` AND t1.`id` > t2.`id`)
 );

ALTER TABLE `telechargements_documents`
  ADD UNIQUE INDEX `telechargements_documents_commande_id_type_document_key`
    (`commande_id`, `type_document`);

INSERT INTO `parametres_systeme` (`id`, `cle`, `valeur`, `updated_at`)
VALUES
  (CONCAT('param-', UUID()), 'numero_agrement', '', NOW(3)),
  (CONCAT('param-', UUID()), 'telephone', '+212 660924488', NOW(3))
ON DUPLICATE KEY UPDATE
  `valeur` = IF(`cle` = 'telephone', '+212 660924488', `valeur`),
  `updated_at` = NOW(3);
