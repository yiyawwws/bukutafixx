const mysql = require('mysql2/promise');
require('dotenv').config();
const run = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bukutafixx'
  });
  const [users] = await pool.query('SELECT id, name, email, role, is_verified FROM users WHERE role = "admin"');
  console.log('Admins:', users);
  
  const [buyers] = await pool.query('SELECT id, name, email, role, is_verified FROM users WHERE role != "admin" LIMIT 1');
  console.log('Target buyer:', buyers);
  
  if (buyers.length > 0) {
    try {
      const [res] = await pool.query('UPDATE users SET is_verified = 1, role = "seller", active_role = "buyer" WHERE id = ?', [buyers[0].id]);
      console.log('Update result:', res);
    } catch (e) {
      console.error('Update error:', e.message);
    }
  }
  process.exit(0);
};
run();
