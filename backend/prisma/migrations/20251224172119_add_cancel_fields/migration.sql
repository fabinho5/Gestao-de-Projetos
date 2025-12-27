-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `assigned_to_id` INTEGER NULL,
    ADD COLUMN `cancel_reason` ENUM('DESIST', 'RETURN', 'DAMAGED_RETURN') NULL,
    ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `return_location_id` INTEGER NULL,
    MODIFY `status` ENUM('PENDING', 'IN_PREPARATION', 'READY_TO_SHIP', 'COMPLETED', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_return_location_id_fkey` FOREIGN KEY (`return_location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
