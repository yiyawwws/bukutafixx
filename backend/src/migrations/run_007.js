require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') }); // or let's just use the pool from database.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bookbekas_db',
    multipleStatements: true
  });

  const sqlFile = path.join(__dirname, '007_unified_order_flow.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  try {
    const [results] = await connection.query(sql);
    console.log('Migration results:', results);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await connection.end();
  }
}
run();
