-- ============================================================
-- Migration: 004_escrow_wallet_service.sql
-- Escrow & Wallet Service Tables
-- Jalankan file ini di database bookbekas_db untuk menambah
-- tabel escrow_transactions, seller_wallets, dan disputes
-- ============================================================

USE bookbekas_db;

-- ─── 1. Tabel seller_wallets ─────────────────────────────────
-- Dompet digital penjual: menyimpan saldo available, hold, dan total pendapatan
CREATE TABLE IF NOT EXISTS seller_wallets (
  id                INT          PRIMARY KEY AUTO_INCREMENT,
  seller_id         INT          NOT NULL UNIQUE,
  balance_available DECIMAL(12,2) NOT NULL DEFAULT 0.00   COMMENT 'Saldo siap dicairkan',
  balance_hold      DECIMAL(12,2) NOT NULL DEFAULT 0.00   COMMENT 'Saldo sedang dalam escrow',
  total_earned      DECIMAL(12,2) NOT NULL DEFAULT 0.00   COMMENT 'Total pendapatan sepanjang waktu',
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 2. Tabel escrow_transactions ────────────────────────────
-- Merekam penahanan dana untuk setiap order per penjual
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id              INT          PRIMARY KEY AUTO_INCREMENT,
  order_id        INT          NOT NULL,
  seller_id       INT          NOT NULL,
  buyer_id        INT          NOT NULL,
  amount          DECIMAL(12,2) NOT NULL                  COMMENT 'Dana yang ditahan',
  status          ENUM('held','released','refunded','disputed') NOT NULL DEFAULT 'held',
  held_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP  COMMENT 'Kapan dana mulai ditahan',
  released_at     TIMESTAMP    NULL DEFAULT NULL          COMMENT 'Kapan dana dicairkan/dikembalikan',
  auto_release_at TIMESTAMP    NOT NULL                   COMMENT 'Batas waktu auto-release (default 3 hari)',
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (buyer_id)  REFERENCES users(id),
  INDEX idx_escrow_order  (order_id),
  INDEX idx_escrow_status (status),
  INDEX idx_escrow_auto   (auto_release_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 3. Tabel disputes ───────────────────────────────────────
-- Mencatat komplain pembeli disertai bukti foto dan keputusan admin
CREATE TABLE IF NOT EXISTS disputes (
  id             INT     PRIMARY KEY AUTO_INCREMENT,
  escrow_id      INT     NOT NULL,
  order_id       INT     NOT NULL,
  buyer_id       INT     NOT NULL,
  seller_id      INT     NOT NULL,
  reason         TEXT    NOT NULL                         COMMENT 'Alasan komplain dari pembeli',
  evidence_photos JSON   DEFAULT NULL                     COMMENT 'Array URL foto bukti (JSON)',
  status         ENUM('open','under_review','resolved_refund','resolved_release')
                         NOT NULL DEFAULT 'open',
  admin_notes    TEXT    DEFAULT NULL                     COMMENT 'Catatan/keputusan admin',
  resolved_by    INT     DEFAULT NULL                     COMMENT 'ID admin yang memutuskan',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at    TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (escrow_id)   REFERENCES escrow_transactions(id),
  FOREIGN KEY (order_id)    REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id)    REFERENCES users(id),
  FOREIGN KEY (seller_id)   REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_dispute_order  (order_id),
  INDEX idx_dispute_status (status),
  INDEX idx_dispute_buyer  (buyer_id),
  INDEX idx_dispute_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Selesai ─────────────────────────────────────────────────
SELECT 'Migration 004_escrow_wallet_service selesai ✓' AS result;
