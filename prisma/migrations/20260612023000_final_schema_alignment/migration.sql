-- Align Booking with the final design: keep only booking-level check-in/out timestamps.
ALTER TABLE `bookings`
  DROP COLUMN `checkInVerifyDoc`,
  DROP COLUMN `checkInRemarks`,
  DROP COLUMN `checkOutRemarks`,
  DROP COLUMN `checkInStaffId`,
  DROP COLUMN `checkOutStaffId`;

-- Align Review with the final design: Review belongs to Booking only.
-- Preserve legacy reviews by linking them to the latest matching booking first.
UPDATE `reviews` AS `r`
SET `r`.`bookingId` = (
  SELECT `b`.`id`
  FROM `bookings` AS `b`
  WHERE `b`.`userId` = `r`.`userId`
    AND `b`.`roomId` = `r`.`roomId`
    AND `b`.`deletedAt` IS NULL
  ORDER BY (`b`.`status` = 'COMPLETED') DESC, `b`.`checkOut` DESC, `b`.`createdAt` DESC
  LIMIT 1
)
WHERE `r`.`bookingId` IS NULL;

-- Reviews without a matching booking cannot be represented in the final schema.
DELETE FROM `reviews`
WHERE `bookingId` IS NULL;

ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_userId_fkey`;
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_roomId_fkey`;

DROP INDEX `reviews_userId_idx` ON `reviews`;
DROP INDEX `reviews_roomId_idx` ON `reviews`;

ALTER TABLE `reviews`
  MODIFY `bookingId` VARCHAR(191) NOT NULL,
  DROP COLUMN `userId`,
  DROP COLUMN `roomId`;
