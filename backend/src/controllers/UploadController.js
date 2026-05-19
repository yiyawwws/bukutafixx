const pool = require('../config/database');

class UploadController {
  /**
   * GET /api/uploads/ktms/:filename  — DEPRECATED
   * Dulu digunakan untuk serve file KTM dari disk lokal.
   * Sekarang KTM disimpan di Cloudinary, URL-nya langsung ada di database (ktm_url, selfie_ktm_url).
   * Route ini dijaga untuk backward compatibility.
   *
   * Untuk akses KTM: Admin cukup ambil data user via GET /api/users/:id
   * dan gunakan field ktm_url (URL Cloudinary) yang ada di response.
   */
  static async serveKtmFile(req, res) {
    try {
      const { filename } = req.params;
      const requesterId = req.user.id;
      const requesterRole = req.user.role;

      // Cari user berdasarkan bagian filename di ktm_url/selfie_ktm_url
      const [rows] = await pool.query(
        'SELECT id, ktm_url, selfie_ktm_url FROM users WHERE id = ? AND (ktm_url LIKE ? OR selfie_ktm_url LIKE ?)',
        [requesterId, `%${filename}%`, `%${filename}%`]
      );

      // Admin bisa redirect ke URL Cloudinary siapapun
      if (requesterRole === 'admin') {
        const [[user]] = await pool.query(
          'SELECT ktm_url, selfie_ktm_url FROM users WHERE ktm_url LIKE ? OR selfie_ktm_url LIKE ?',
          [`%${filename}%`, `%${filename}%`]
        );
        if (!user) return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
        const url = user.ktm_url?.includes(filename) ? user.ktm_url : user.selfie_ktm_url;
        return res.redirect(url);
      }

      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view this file.',
        });
      }

      const user = rows[0];
      const url = user.ktm_url?.includes(filename) ? user.ktm_url : user.selfie_ktm_url;
      return res.redirect(url);

    } catch (err) {
      console.error('Serve KTM File Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = UploadController;
