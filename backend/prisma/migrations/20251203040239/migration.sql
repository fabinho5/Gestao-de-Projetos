/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `password_updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `refresh_token` VARCHAR(191) NULL,
    ADD COLUMN `username` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);
