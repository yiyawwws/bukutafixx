const pool = require('../config/database');

/**
 * Menyimpan file buffer ke database tabel `files` dan mereturn URL-nya.
 * @param {Object} file - Object multer file (req.file)
 * @returns {Promise<string>} URL lokal (contoh: /api/files/123)
 */
async function saveFileToDB(file) {
  if (!file || !file.buffer) return null;
  const [result] = await pool.query(
    'INSERT INTO files (filename, mime_type, data) VALUES (?, ?, ?)',
    [file.originalname || 'upload', file.mimetype, file.buffer]
  );
  return `/api/files/${result.insertId}`;
}

module.exports = { saveFileToDB };
