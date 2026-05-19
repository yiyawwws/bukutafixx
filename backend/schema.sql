-- ============================================
-- BookBekas Database Schema
-- ============================================

USE bookbekas_db;

-- Tabel categories
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel users
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  avatar VARCHAR(255) DEFAULT NULL,
  role ENUM('admin','seller','buyer') DEFAULT 'buyer',
  active_role ENUM('seller','buyer') DEFAULT 'buyer',
  is_active BOOLEAN DEFAULT TRUE,
  nim VARCHAR(50) DEFAULT NULL,
  university VARCHAR(150) DEFAULT NULL,
  ktm_url VARCHAR(255) DEFAULT NULL,
  selfie_ktm_url VARCHAR(255) DEFAULT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel books
CREATE TABLE IF NOT EXISTS books (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL,
  category_id INT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(150) NOT NULL,
  isbn VARCHAR(50),
  `condition` ENUM('like_new','good','fair','poor') NOT NULL DEFAULT 'good',
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  stock INT NOT NULL DEFAULT 1,
  is_available BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Tabel cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  UNIQUE KEY uq_cart (user_id, book_id)
);

-- Tabel orders
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  buyer_id INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_status ENUM('pending','paid','failed') DEFAULT 'pending',
  delivery_status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel order_items
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  book_id INT NOT NULL,
  seller_id INT NOT NULL,
  quantity INT NOT NULL,
  price_at_purchase DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- Tabel reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  book_id INT NOT NULL,
  buyer_id INT NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_review (book_id, buyer_id)
);

-- Tabel chats
CREATE TABLE IF NOT EXISTS chats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_chat_users (buyer_id, seller_id)
);

-- Tabel messages
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Escrow & Wallet Service Tables
-- ============================================

-- Tabel seller_wallets (dompet digital per penjual)
CREATE TABLE IF NOT EXISTS seller_wallets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL UNIQUE,
  balance_available DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance_hold DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel escrow_transactions (penahanan dana per order)
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  seller_id INT NOT NULL,
  buyer_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('held','released','refunded','disputed') NOT NULL DEFAULT 'held',
  held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP NULL DEFAULT NULL,
  auto_release_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);

-- Tabel disputes (komplain pembeli)
CREATE TABLE IF NOT EXISTS disputes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  escrow_id INT NOT NULL,
  order_id INT NOT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  reason TEXT NOT NULL,
  evidence_photos JSON DEFAULT NULL,
  status ENUM('open','under_review','resolved_refund','resolved_release') NOT NULL DEFAULT 'open',
  admin_notes TEXT DEFAULT NULL,
  resolved_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (escrow_id) REFERENCES escrow_transactions(id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- Seed Data
-- ============================================

-- Default categories
INSERT IGNORE INTO categories (name, slug) VALUES
('Fiksi', 'fiksi'),
('Non-Fiksi', 'non-fiksi'),
('Pendidikan', 'pendidikan'),
('Sains & Teknologi', 'sains-teknologi'),
('Bisnis & Ekonomi', 'bisnis-ekonomi'),
('Sejarah', 'sejarah'),
('Agama & Spiritual', 'agama-spiritual'),
('Kesehatan', 'kesehatan'),
('Komik & Manga', 'komik-manga'),
('Lainnya', 'lainnya');

-- Default admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password, role, active_role) VALUES
('Administrator', 'admin@bookbekas.com', '$2b$10$VWP9YZnXNq7abItFEbH7vOK4lB.Q33sZOzzDzLUGdNgv3I36CxNTW', 'admin', 'buyer');
