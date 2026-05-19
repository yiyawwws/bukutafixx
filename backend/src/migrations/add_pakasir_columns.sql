-- ============================================
-- Migration: Tambah kolom Pakasir ke tabel orders
-- Jalankan sekali setelah deploy
-- ============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pakasir_order_id VARCHAR(100) DEFAULT NULL COMMENT 'Order ID dari Pakasir (format: BKT-{orderId})',
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL COMMENT 'Metode pembayaran: qris, bni_va, dll',
  ADD COLUMN IF NOT EXISTS payment_fee DECIMAL(10,2) DEFAULT NULL COMMENT 'Biaya layanan Pakasir',
  ADD COLUMN IF NOT EXISTS payment_total DECIMAL(12,2) DEFAULT NULL COMMENT 'Total yang harus dibayar (amount + fee)',
  ADD COLUMN IF NOT EXISTS payment_url VARCHAR(500) DEFAULT NULL COMMENT 'URL halaman pembayaran Pakasir',
  ADD COLUMN IF NOT EXISTS payment_number VARCHAR(100) DEFAULT NULL COMMENT 'Nomor VA / QRIS / dll',
  ADD COLUMN IF NOT EXISTS payment_expired_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Kapan payment kedaluwarsa';

-- Index untuk pencarian by pakasir_order_id
CREATE INDEX IF NOT EXISTS idx_orders_pakasir_order_id ON orders(pakasir_order_id);
