-- DropForeignKey
ALTER TABLE `access_logs` DROP FOREIGN KEY `access_logs_userId_fkey`;

-- DropForeignKey
ALTER TABLE `book_approvals` DROP FOREIGN KEY `book_approvals_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `book_approvals` DROP FOREIGN KEY `book_approvals_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_userId_fkey`;

-- DropForeignKey
ALTER TABLE `cancel_requests` DROP FOREIGN KEY `cancel_requests_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `cancel_requests` DROP FOREIGN KEY `cancel_requests_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `cancel_requests` DROP FOREIGN KEY `cancel_requests_userId_fkey`;

-- DropForeignKey
ALTER TABLE `check_in_logs` DROP FOREIGN KEY `check_in_logs_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `check_in_logs` DROP FOREIGN KEY `check_in_logs_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `check_out_logs` DROP FOREIGN KEY `check_out_logs_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `check_out_logs` DROP FOREIGN KEY `check_out_logs_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `payment_transactions` DROP FOREIGN KEY `payment_transactions_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `payment_transactions` DROP FOREIGN KEY `payment_transactions_verifiedById_fkey`;

-- DropForeignKey
ALTER TABLE `payment_transactions` DROP FOREIGN KEY `payment_transactions_verifiedByUserId_fkey`;

-- DropForeignKey
ALTER TABLE `price_configs` DROP FOREIGN KEY `price_configs_roomTypeId_fkey`;

-- DropForeignKey
ALTER TABLE `review_manage` DROP FOREIGN KEY `review_manage_reviewId_fkey`;

-- DropForeignKey
ALTER TABLE `review_manage` DROP FOREIGN KEY `review_manage_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `rooms` DROP FOREIGN KEY `rooms_roomTypeId_fkey`;

-- DropForeignKey
ALTER TABLE `staff` DROP FOREIGN KEY `staff_userId_fkey`;

-- DropForeignKey
ALTER TABLE `status_room` DROP FOREIGN KEY `status_room_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `status_room` DROP FOREIGN KEY `status_room_staffId_fkey`;

-- DropIndex
DROP INDEX `book_approvals_staffId_fkey` ON `book_approvals`;

-- DropIndex
DROP INDEX `cancel_requests_staffId_fkey` ON `cancel_requests`;

-- DropIndex
DROP INDEX `check_in_logs_staffId_fkey` ON `check_in_logs`;

-- DropIndex
DROP INDEX `check_out_logs_staffId_fkey` ON `check_out_logs`;

-- DropIndex
DROP INDEX `review_manage_staffId_fkey` ON `review_manage`;

-- DropIndex
DROP INDEX `status_room_staffId_fkey` ON `status_room`;

-- AlterTable
ALTER TABLE `access_logs` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `userId` VARCHAR(30) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `book_approvals` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `bookingId` VARCHAR(30) NOT NULL,
    MODIFY `staffId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `bookings` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `userId` VARCHAR(30) NOT NULL,
    MODIFY `roomId` VARCHAR(30) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `cancel_requests` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `bookingId` VARCHAR(30) NOT NULL,
    MODIFY `userId` VARCHAR(30) NOT NULL,
    MODIFY `staffId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `check_in_logs` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `bookingId` VARCHAR(30) NOT NULL,
    MODIFY `staffId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `check_out_logs` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `bookingId` VARCHAR(30) NOT NULL,
    MODIFY `staffId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `payment_transactions` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `bookingId` VARCHAR(30) NOT NULL,
    MODIFY `verifiedById` VARCHAR(30) NULL,
    MODIFY `verifiedByUserId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `price_configs` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `roomTypeId` VARCHAR(30) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `review_manage` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `reviewId` VARCHAR(30) NOT NULL,
    MODIFY `staffId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `reviews` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `bookingId` VARCHAR(30) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `room_types` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `rooms` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `roomTypeId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `staff` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `userId` VARCHAR(30) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `status_room` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    MODIFY `roomId` VARCHAR(30) NOT NULL,
    MODIFY `staffId` VARCHAR(30) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(30) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `staff` ADD CONSTRAINT `staff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `room_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_configs` ADD CONSTRAINT `price_configs_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_verifiedByUserId_fkey` FOREIGN KEY (`verifiedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_approvals` ADD CONSTRAINT `book_approvals_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_approvals` ADD CONSTRAINT `book_approvals_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_in_logs` ADD CONSTRAINT `check_in_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_in_logs` ADD CONSTRAINT `check_in_logs_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_out_logs` ADD CONSTRAINT `check_out_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_out_logs` ADD CONSTRAINT `check_out_logs_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancel_requests` ADD CONSTRAINT `cancel_requests_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancel_requests` ADD CONSTRAINT `cancel_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancel_requests` ADD CONSTRAINT `cancel_requests_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_manage` ADD CONSTRAINT `review_manage_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_manage` ADD CONSTRAINT `review_manage_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `status_room` ADD CONSTRAINT `status_room_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `status_room` ADD CONSTRAINT `status_room_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `access_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

