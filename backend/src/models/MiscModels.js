const pool = require('../config/database');

class ChatModel {
  static async create(data) {
    const { id_trans, id_sender, pesan_teks } = data;
    const [result] = await pool.query(
      'INSERT INTO Chats (id_trans, id_sender, pesan_teks) VALUES (?, ?, ?)',
      [id_trans, id_sender, pesan_teks]
    );
    return result.insertId;
  }
}

class ReviewModel {
  static async create(data) {
    const { id_trans, skor_bintang, komentar } = data;
    const [result] = await pool.query(
      'INSERT INTO Reviews (id_trans, skor_bintang, komentar) VALUES (?, ?, ?)',
      [id_trans, skor_bintang, komentar]
    );
    return result.insertId;
  }
}

class DisputeModel {
  static async create(data) {
    const { id_trans, alasan_komplain, bukti_foto } = data;
    const [result] = await pool.query(
      'INSERT INTO Disputes (id_trans, alasan_komplain, bukti_foto, status) VALUES (?, ?, ?, ?)',
      [id_trans, alasan_komplain, bukti_foto, 'open']
    );
    return result.insertId;
  }
}

module.exports = { ChatModel, ReviewModel, DisputeModel };
