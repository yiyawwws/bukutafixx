const pool = require('../config/database');

class UserModel {
  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM Users WHERE id = ?', [id]);
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
    return rows[0];
  }

  static async updateIdentity(id, identityType, identityNumber, status = 'unverified') {
    const [result] = await pool.query(
      'UPDATE Users SET identity_type = ?, identity_number = ?, status_verifikasi = ? WHERE id = ?',
      [identityType, identityNumber, status, id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = UserModel;
