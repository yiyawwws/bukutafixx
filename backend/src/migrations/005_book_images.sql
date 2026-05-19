-- Migration: Tabel book_images untuk multi-foto buku
-- Jalankan di MySQL: source 005_book_images.sql

-- 1. Buat tabel book_images
CREATE TABLE IF NOT EXISTS book_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  book_id     INT NOT NULL,
  url         VARCHAR(500) NOT NULL,
  is_cover    BOOLEAN DEFAULT FALSE,
  sort_order  TINYINT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 2. Migrasi data lama: pindahkan cover_image yang ada ke book_images
-- Hanya buku yang punya cover_image (tidak null dan tidak kosong)
INSERT INTO book_images (book_id, url, is_cover, sort_order)
SELECT id, cover_image, TRUE, 0
FROM books
WHERE cover_image IS NOT NULL AND cover_image != '';

-- 3. Indeks untuk performa query (abaikan error jika sudah ada)
CREATE INDEX idx_book_images_book_id ON book_images(book_id);
CREATE INDEX idx_book_images_is_cover ON book_images(book_id, is_cover);
