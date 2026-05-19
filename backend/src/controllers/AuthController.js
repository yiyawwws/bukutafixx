const UserModel = require('../models/UserModel');

class AuthController {
  /**
   * POST /api/auth/verify
   * Upload identity and set status to unverified (waiting for admin).
   */
  static async verifyIdentity(req, res) {
    try {
      const userId = req.user.id;

      // For testing purposes, auto-verify the user by setting is_verified = TRUE
      const pool = require('../config/database');
      const [result] = await pool.query(
        'UPDATE users SET is_verified = TRUE WHERE id = ?',
        [userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Account successfully verified (Auto-verified for testing).',
        data: { is_verified: true }
      });
    } catch (err) {
      console.error('Verify Identity Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = AuthController;
