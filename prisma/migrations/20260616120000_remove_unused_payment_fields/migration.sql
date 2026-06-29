-- PaymentTransaction.note is not used by any UX, API client, business flow, or report.
--   The verify endpoint accepted an optional `note`, but no client ever sends it and
--   no screen/report ever reads it.
-- PaymentTransaction.verifiedAt was written on verify but never read, displayed, sorted,
--   or reported anywhere. Audit of "who verified" is retained via `verifiedById`.
-- Both fields are dropped; `verifiedById` (kept) still records the verifying staff.
ALTER TABLE `payment_transactions` DROP COLUMN `note`;
ALTER TABLE `payment_transactions` DROP COLUMN `verifiedAt`;
