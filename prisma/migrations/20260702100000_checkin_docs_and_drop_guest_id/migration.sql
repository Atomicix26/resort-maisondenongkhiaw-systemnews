-- DropColumn (guestIdCard ຍ້າຍໄປເກັບຕອນ check-in)
ALTER TABLE `bookings` DROP COLUMN `guestIdCard`;

-- AlterTable: CheckInLog — replace verifyDoc with structured verification fields
ALTER TABLE `check_in_logs` DROP COLUMN `verifyDoc`;
ALTER TABLE `check_in_logs` ADD COLUMN `docType` VARCHAR(191) NULL;
ALTER TABLE `check_in_logs` ADD COLUMN `docNumber` VARCHAR(191) NULL;
ALTER TABLE `check_in_logs` ADD COLUMN `nationality` VARCHAR(191) NULL;
ALTER TABLE `check_in_logs` ADD COLUMN `docExpiry` DATETIME(3) NULL;
ALTER TABLE `check_in_logs` ADD COLUMN `docImage` VARCHAR(191) NULL;
