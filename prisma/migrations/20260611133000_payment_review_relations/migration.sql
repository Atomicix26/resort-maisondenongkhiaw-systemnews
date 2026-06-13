-- Preserve existing payment rows before adding the verifier foreign key.
UPDATE `payment_transactions` AS `pt`
LEFT JOIN `staff` AS `s` ON `pt`.`verifiedById` = `s`.`id`
SET `pt`.`verifiedById` = NULL
WHERE `pt`.`verifiedById` IS NOT NULL
  AND `s`.`id` IS NULL;

-- Payment verifier audit relation.
CREATE INDEX `payment_transactions_verifiedById_idx` ON `payment_transactions`(`verifiedById`);
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_verifiedById_fkey`
  FOREIGN KEY (`verifiedById`) REFERENCES `staff`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Review can now be tied to the completed booking that allowed it.
ALTER TABLE `reviews` ADD COLUMN `bookingId` VARCHAR(191) NULL;
CREATE INDEX `reviews_userId_idx` ON `reviews`(`userId`);
ALTER TABLE `reviews` DROP INDEX `reviews_userId_roomId_key`;
CREATE UNIQUE INDEX `reviews_bookingId_key` ON `reviews`(`bookingId`);
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_bookingId_fkey`
  FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
