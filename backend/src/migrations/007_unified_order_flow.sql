-- Migration: 007_unified_order_flow.sql
-- Description: Implement a unified order flow by adding `status` column to `orders`, 
-- mapping old data, creating `shipments` and `complaints` tables, and adding missing 
-- columns to `escrow_transactions` and `seller_wallets`.

-- 1. Add `status` column to `orders`
ALTER TABLE orders
ADD COLUMN status ENUM(
    'pending_payment', 
    'paid_escrow', 
    'waiting_seller_shipment', 
    'shipped', 
    'received', 
    'complaint', 
    'completed', 
    'refunded', 
    'cancelled'
) NOT NULL DEFAULT 'pending_payment';

-- Map old statuses (payment_status and delivery_status) to the new `status` column safely
UPDATE orders 
SET status = CASE 
    WHEN delivery_status = 'cancelled' THEN 'cancelled'
    WHEN payment_status = 'failed' THEN 'cancelled'
    WHEN payment_status = 'pending' THEN 'pending_payment'
    WHEN payment_status = 'paid' AND delivery_status = 'pending' THEN 'paid_escrow'
    WHEN payment_status = 'paid' AND delivery_status = 'processing' THEN 'waiting_seller_shipment'
    WHEN payment_status = 'paid' AND delivery_status = 'shipped' THEN 'shipped'
    WHEN payment_status = 'paid' AND delivery_status = 'delivered' THEN 'completed'
    ELSE 'pending_payment'
END;

-- 2. Create `shipments` table
CREATE TABLE IF NOT EXISTS shipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    seller_id INT NOT NULL,
    courier_name VARCHAR(150) NOT NULL,
    tracking_number VARCHAR(150) NULL,
    shipping_proof_image VARCHAR(255) NULL,
    shipping_note TEXT NULL,
    shipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add missing columns to `escrow_transactions`
-- We only add `refunded_at` since `updated_at` might not exist (we saw it didn't in DESCRIBE)
ALTER TABLE escrow_transactions
ADD COLUMN refunded_at TIMESTAMP NULL,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 4. Add missing columns to `seller_wallets`
ALTER TABLE seller_wallets
ADD COLUMN total_withdrawn DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Create `complaints` table (leaves `disputes` alone)
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    buyer_id INT NOT NULL,
    reason TEXT NOT NULL,
    evidence_image VARCHAR(255) NULL,
    status ENUM('pending', 'approved_refund', 'rejected', 'resolved') NOT NULL DEFAULT 'pending',
    admin_note TEXT NULL,
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

