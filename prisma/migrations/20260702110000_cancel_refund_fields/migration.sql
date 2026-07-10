-- AlterTable: CancelRequest — refund computation + payout bank details
ALTER TABLE `cancel_requests` ADD COLUMN `refundPercent` INTEGER NULL;
ALTER TABLE `cancel_requests` ADD COLUMN `refundAmount` DECIMAL(10, 2) NULL;
ALTER TABLE `cancel_requests` ADD COLUMN `refundBankName` VARCHAR(191) NULL;
ALTER TABLE `cancel_requests` ADD COLUMN `refundAccountName` VARCHAR(191) NULL;
ALTER TABLE `cancel_requests` ADD COLUMN `refundAccountNumber` VARCHAR(191) NULL;
