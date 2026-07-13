const mysql = require('mysql2/promise');
require('dotenv').config();
const run = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bookbekas_db'
  });
  
  try {
    const createFiles = 
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    ;
    await pool.query(createFiles);
    console.log('Table "files" ensured.');
    
    // Check book_images just in case
    const createBookImages = 
      CREATE TABLE IF NOT EXISTS book_images (
        id INT PRIMARY KEY AUTO_INCREMENT,
        book_id INT NOT NULL,
        url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );
    ;
    await pool.query(createBookImages);
    console.log('Table "book_images" ensured.');

  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
};
run();
