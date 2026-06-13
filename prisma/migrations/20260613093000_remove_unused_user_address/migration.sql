-- User.address is not used by the current UX, API, business flow, or reports.
-- Existing database check before this migration found 0 non-empty address values.
ALTER TABLE `users` DROP COLUMN `address`;
