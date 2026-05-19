-- Migration Script for Bukuta' Revision
-- Database: MySQL

-- 1. Table Users
-- Dropping existing users table if necessary or modifying it
-- For a total revision, we'll create the structure as specified.
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    identity_type ENUM('KTM', 'KTP'),
    identity_number VARCHAR(50),
    phone VARCHAR(20),
    status_verifikasi ENUM('unverified', 'verified') DEFAULT 'unverified',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Table Books
CREATE TABLE IF NOT EXISTS Books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_penjual INT NOT NULL,
    judul VARCHAR(255) NOT NULL,
    kondisi VARCHAR(100),
    harga DECIMAL(15, 2) NOT NULL,
    foto_detail VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_penjual) REFERENCES Users(id) ON DELETE CASCADE
);

-- 3. Table Transactions
CREATE TABLE IF NOT EXISTS Transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pembeli INT NOT NULL,
    id_buku INT NOT NULL,
    total_bayar DECIMAL(15, 2) NOT NULL,
    status_escrow ENUM('pending', 'hold', 'released', 'refunded') DEFAULT 'pending',
    snap_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pembeli) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (id_buku) REFERENCES Books(id) ON DELETE CASCADE
);

-- 4. Table Escrow_Wallets
CREATE TABLE IF NOT EXISTS Escrow_Wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT NOT NULL UNIQUE,
    saldo_hold DECIMAL(15, 2) DEFAULT 0.00,
    saldo_available DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES Users(id) ON DELETE CASCADE
);

-- 5. Table Chats
CREATE TABLE IF NOT EXISTS Chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_trans INT NOT NULL,
    id_sender INT NOT NULL,
    pesan_teks TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_trans) REFERENCES Transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (id_sender) REFERENCES Users(id) ON DELETE CASCADE
);

-- 6. Table Reviews
CREATE TABLE IF NOT EXISTS Reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_trans INT NOT NULL,
    skor_bintang TINYINT CHECK (skor_bintang BETWEEN 1 AND 5),
    komentar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_trans) REFERENCES Transactions(id) ON DELETE CASCADE
);

-- 7. Table Disputes
CREATE TABLE IF NOT EXISTS Disputes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_trans INT NOT NULL,
    alasan_komplain TEXT NOT NULL,
    bukti_foto VARCHAR(255),
    status ENUM('open', 'resolved') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_trans) REFERENCES Transactions(id) ON DELETE CASCADE
);
