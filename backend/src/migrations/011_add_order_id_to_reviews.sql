-- Migration: 011_add_order_id_to_reviews.sql
-- Description: Adds order_id to the reviews table and updates the unique constraint to tie a review to an order.

ALTER TABLE reviews 
  ADD COLUMN order_id INT NULL DEFAULT NULL AFTER id;

ALTER TABLE reviews
  ADD CONSTRAINT fk_reviews_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Add index on book_id first so the foreign key can use it when we drop the unique key
ALTER TABLE reviews ADD INDEX idx_book_id (book_id);

-- Drop the old unique constraint (book_id, buyer_id)
ALTER TABLE reviews DROP INDEX uq_review;

-- Create the new unique constraint (order_id, book_id) so a buyer only reviews a book once per order
ALTER TABLE reviews ADD UNIQUE KEY uq_review_order (order_id, book_id);

SELECT 'Migration 011_add_order_id_to_reviews selesai ✓' AS result;
