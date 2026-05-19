-- Migration: 006_escrow_wallet.sql
-- Membuat tabel escrow_transactions dan seller_wallets untuk sistem pembayaran escrow

-- ─── Tabel seller_wallets ────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_wallets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  seller_id       INT NOT NULL UNIQUE,
  balance_available DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  balance_hold      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_earned      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Tabel escrow_transactions ──────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT NOT NULL,
  seller_id       INT NOT NULL,
  buyer_id        INT NOT NULL,
  amount          DECIMAL(15,2) NOT NULL,
  status          ENUM('held','released','refunded','disputed') NOT NULL DEFAULT 'held',
  held_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at     TIMESTAMP NULL,
  auto_release_at TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (buyer_id)  REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Tabel disputes (untuk pengajuan sengketa) ──────────────
CREATE TABLE IF NOT EXISTS disputes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  escrow_id       INT NOT NULL,
  order_id        INT NOT NULL,
  buyer_id        INT NOT NULL,
  seller_id       INT NOT NULL,
  reason          TEXT NOT NULL,
  evidence_photos JSON NULL,
  status          ENUM('open','under_review','resolved_refund','resolved_release') NOT NULL DEFAULT 'open',
  admin_notes     TEXT NULL,
  resolved_by     INT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at     TIMESTAMP NULL,
  FOREIGN KEY (escrow_id)  REFERENCES escrow_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id)   REFERENCES orders(id)              ON DELETE CASCADE,
  FOREIGN KEY (buyer_id)   REFERENCES users(id)               ON DELETE CASCADE,
  FOREIGN KEY (seller_id)  REFERENCES users(id)               ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
