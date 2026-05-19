-- Migration: 008_bank_accounts_withdrawals.sql
-- Description: Add seller bank account input and withdrawal request management.
-- SAFE: Uses CREATE TABLE IF NOT EXISTS only. Does NOT drop or alter existing tables destructively.

-- ─── 1. seller_bank_accounts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_bank_accounts (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    seller_id           INT NOT NULL,
    bank_name           VARCHAR(100) NOT NULL,
    account_number      VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(150) NOT NULL,
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at         TIMESTAMP NULL DEFAULT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sba_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 2. withdrawal_requests ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    seller_id       INT NOT NULL,
    bank_account_id INT NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    status          ENUM('pending','approved','paid','rejected') NOT NULL DEFAULT 'pending',
    admin_note      TEXT NULL,
    transfer_proof  VARCHAR(255) NULL,
    requested_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at     TIMESTAMP NULL DEFAULT NULL,
    paid_at         TIMESTAMP NULL DEFAULT NULL,
    rejected_at     TIMESTAMP NULL DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id)       REFERENCES users(id)                ON DELETE CASCADE,
    FOREIGN KEY (bank_account_id) REFERENCES seller_bank_accounts(id) ON DELETE RESTRICT,
    INDEX idx_wr_seller (seller_id),
    INDEX idx_wr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 3. Guard: ensure total_withdrawn column exists on seller_wallets ─────────
-- (Migration 007 added this, but run guard in case 007 was skipped on some instances)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'seller_wallets'
      AND COLUMN_NAME  = 'total_withdrawn'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE seller_wallets ADD COLUMN total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0.00',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
