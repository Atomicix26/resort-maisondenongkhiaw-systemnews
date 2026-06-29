-- AlterTable
ALTER TABLE `payment_transactions` ADD COLUMN `reason` TEXT NULL,
    ADD COLUMN `verifiedAt` DATETIME(3) NULL,
    ADD COLUMN `verifiedByUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `payment_transactions_verifiedByUserId_idx` ON `payment_transactions`(`verifiedByUserId`);

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_verifiedByUserId_fkey` FOREIGN KEY (`verifiedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
