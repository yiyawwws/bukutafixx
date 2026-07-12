-- Migration: Tabel files untuk penyimpanan database-only
-- Jalankan di MySQL: source 012_files_storage.sql

CREATE TABLE IF NOT EXISTS files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  data LONGBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
