const pool = require('../config/database');

class FileController {
  /**
   * Mengambil file dari database berdasarkan ID
   * GET /api/files/:id
   */
  static async getFile(req, res) {
    try {
      const { id } = req.params;

      const [rows] = await pool.query(
        'SELECT filename, mime_type, data FROM files WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
      }

      const file = rows[0];

      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
      
      // Kirim buffer biner
      res.send(file.data);

    } catch (err) {
      console.error('Get File Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = FileController;
