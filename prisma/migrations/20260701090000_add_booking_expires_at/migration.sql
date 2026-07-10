-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `bookings_status_expiresAt_idx` ON `bookings`(`status`, `expiresAt`);
