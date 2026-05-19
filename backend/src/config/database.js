const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'bookbekas_db',
  port:     parseInt(process.env.DB_PORT) || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log(`✅ Database connected: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    conn.release();
  })
  .catch(err => {
    console.error(`❌ Database connection failed: ${err.message}`);
    console.error('   Pastikan MySQL berjalan dan kredensial .env sudah benar.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Di production, exit jika DB tidak bisa diakses
    }
  });

module.exports = pool;
