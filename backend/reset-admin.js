require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function resetAdmin() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bookbekas_db',
    port: process.env.DB_PORT || 3306,
  });

  try {
    const newPassword = 'admin123';
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('Hash baru:', hash);

    // Cek apakah admin sudah ada
    const [rows] = await pool.query("SELECT id, email, role FROM users WHERE email = 'admin@bookbekas.com'");
    
    if (rows.length === 0) {
      // Admin belum ada, insert baru
      await pool.query(
        "INSERT INTO users (name, email, password, role, active_role, is_active) VALUES (?, ?, ?, 'admin', 'buyer', 1)",
        ['Administrator', 'admin@bookbekas.com', hash]
      );
      console.log('✅ Admin berhasil dibuat!');
    } else {
      // Admin sudah ada, update password
      await pool.query("UPDATE users SET password = ? WHERE email = 'admin@bookbekas.com'", [hash]);
      console.log('✅ Password admin berhasil diupdate!');
    }

    // Verifikasi
    const [verify] = await pool.query("SELECT id, name, email, role, is_active FROM users WHERE email = 'admin@bookbekas.com'");
    console.log('Data admin:', verify[0]);

    // Test bcrypt match
    const match = await bcrypt.compare(newPassword, hash);
    console.log('✅ Verifikasi bcrypt:', match ? 'BERHASIL' : 'GAGAL');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

resetAdmin();
