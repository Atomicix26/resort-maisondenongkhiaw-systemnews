/*
  Warnings:

  - You are about to alter the column `otpCode` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(64)`.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `otpCode` VARCHAR(64) NULL;
