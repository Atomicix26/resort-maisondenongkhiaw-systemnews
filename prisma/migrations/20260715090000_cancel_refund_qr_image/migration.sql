-- AlterTable: CancelRequest — optional customer QR image for manual refund transfer
ALTER TABLE `cancel_requests` ADD COLUMN `refundQrImage` VARCHAR(191) NULL;
