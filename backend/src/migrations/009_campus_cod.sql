-- Safe modifications to orders table for Campus COD feature

-- 1. Extend the ENUM for the status column to support COD statuses
ALTER TABLE orders MODIFY COLUMN status ENUM(
  'pending_payment', 
  'paid_escrow', 
  'waiting_seller_shipment', 
  'shipped', 
  'received', 
  'complaint', 
  'completed', 
  'refunded', 
  'cancelled',
  'cod_pending', 
  'cod_accepted', 
  'cod_meetup_scheduled', 
  'cod_completed', 
  'cod_cancelled', 
  'cod_failed'
) DEFAULT 'pending_payment';

-- 2. Add new columns related to Campus COD
-- We use a stored procedure to safely add columns only if they do not exist
DELIMITER //

CREATE PROCEDURE AddCodColumns()
BEGIN
    -- fulfillment_method
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'fulfillment_method') THEN
        ALTER TABLE orders ADD COLUMN fulfillment_method VARCHAR(50) DEFAULT 'seller_shipping';
    END IF;

    -- meetup_location
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'meetup_location') THEN
        ALTER TABLE orders ADD COLUMN meetup_location TEXT NULL;
    END IF;

    -- meetup_time
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'meetup_time') THEN
        ALTER TABLE orders ADD COLUMN meetup_time VARCHAR(100) NULL;
    END IF;

    -- meetup_note
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'meetup_note') THEN
        ALTER TABLE orders ADD COLUMN meetup_note TEXT NULL;
    END IF;

    -- handover_code
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'handover_code') THEN
        ALTER TABLE orders ADD COLUMN handover_code VARCHAR(10) NULL;
    END IF;

    -- handover_verified_at
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'handover_verified_at') THEN
        ALTER TABLE orders ADD COLUMN handover_verified_at TIMESTAMP NULL;
    END IF;
END //

DELIMITER ;

CALL AddCodColumns();
DROP PROCEDURE AddCodColumns;
