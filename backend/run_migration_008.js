require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bookbekas_db',
    multipleStatements: true,
  });

  console.log('[Migration 008] Connected to database:', process.env.DB_NAME);

  // Run migration SQL
  const sqlFile = path.join(__dirname, 'src/migrations/008_bank_accounts_withdrawals.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  try {
    await conn.query(sql);
    console.log('[Migration 008] SQL executed successfully');
  } catch (err) {
    console.error('[Migration 008] SQL Error:', err.message);
  }

  // Verify
  const [t1] = await conn.query("SHOW TABLES LIKE 'seller_bank_accounts'");
  const [t2] = await conn.query("SHOW TABLES LIKE 'withdrawal_requests'");
  console.log('seller_bank_accounts table exists:', t1.length > 0 ? 'YES' : 'NO');
  console.log('withdrawal_requests table exists:  ', t2.length > 0 ? 'YES' : 'NO');

  const [cols] = await conn.query('SHOW COLUMNS FROM seller_wallets');
  console.log('seller_wallets columns:', cols.map(c => c.Field).join(', '));

  await conn.end();
  console.log('[Migration 008] Done.');
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
