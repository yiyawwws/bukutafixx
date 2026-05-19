const pool = require('../config/database');

class BookModel {
  static async findAllAvailable() {
    const [rows] = await pool.query('SELECT * FROM Books WHERE is_available = TRUE');
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM Books WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(bookData) {
    const { id_penjual, judul, kondisi, harga, foto_detail } = bookData;
    const [result] = await pool.query(
      'INSERT INTO Books (id_penjual, judul, kondisi, harga, foto_detail) VALUES (?, ?, ?, ?, ?)',
      [id_penjual, judul, kondisi, harga, foto_detail]
    );
    return result.insertId;
  }
}

module.exports = BookModel;
