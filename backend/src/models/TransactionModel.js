const pool = require('../config/database');

class TransactionModel {
  static async create(data) {
    const { id_pembeli, id_buku, total_bayar, status_escrow, snap_token } = data;
    const [result] = await pool.query(
      'INSERT INTO Transactions (id_pembeli, id_buku, total_bayar, status_escrow, snap_token) VALUES (?, ?, ?, ?, ?)',
      [id_pembeli, id_buku, total_bayar, status_escrow || 'pending', snap_token || null]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM Transactions WHERE id = ?', [id]);
    return rows[0];
  }

  static async updateStatus(id, status) {
    const [result] = await pool.query(
      'UPDATE Transactions SET status_escrow = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = TransactionModel;
