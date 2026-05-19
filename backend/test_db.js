require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bookbekas_db',
    });
    
    const [cols] = await connection.query('SHOW COLUMNS FROM orders');
    console.log('orders table columns:');
    cols.forEach(c => console.log(c.Field, c.Type));

    await connection.end();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();
