-- `updatedAt` is not surfaced anywhere in the project: no "Last Update" screen,
-- no edit/audit report, no ordering by it, and it is never read in any .tsx.
-- It was only ever auto-written by Prisma (@updatedAt) plus one manual write in the
-- review-update route (now removed). Dropped from every table that had it.
ALTER TABLE `users` DROP COLUMN `updatedAt`;
ALTER TABLE `staff` DROP COLUMN `updatedAt`;
ALTER TABLE `room_types` DROP COLUMN `updatedAt`;
ALTER TABLE `rooms` DROP COLUMN `updatedAt`;
ALTER TABLE `price_configs` DROP COLUMN `updatedAt`;
ALTER TABLE `bookings` DROP COLUMN `updatedAt`;
ALTER TABLE `payment_transactions` DROP COLUMN `updatedAt`;
ALTER TABLE `reviews` DROP COLUMN `updatedAt`;
