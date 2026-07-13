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
    const hash = '$2b$10$llhk4cChY6ytpF4EpkoM9.0ha/jDZSO.pMtoyfvvWcOACkc.yXchu';
    const [result] = await pool.query('UPDATE users SET password = ? WHERE email LIKE ?', [hash, 'user%@bookbekas.com']);
    console.log('Updated', result.affectedRows, 'users');
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
};

run();
