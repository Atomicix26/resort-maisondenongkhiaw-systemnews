ALTER TABLE `check_in_logs` ADD COLUMN `performedByUserId` VARCHAR(30) NULL;
ALTER TABLE `check_out_logs` ADD COLUMN `performedByUserId` VARCHAR(30) NULL;

CREATE INDEX `check_in_logs_performedByUserId_idx` ON `check_in_logs`(`performedByUserId`);
CREATE INDEX `check_out_logs_performedByUserId_idx` ON `check_out_logs`(`performedByUserId`);

ALTER TABLE `check_in_logs`
  ADD CONSTRAINT `check_in_logs_performedByUserId_fkey`
  FOREIGN KEY (`performedByUserId`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `check_out_logs`
  ADD CONSTRAINT `check_out_logs_performedByUserId_fkey`
  FOREIGN KEY (`performedByUserId`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
