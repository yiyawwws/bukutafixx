const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/chats (Get all chats for auth user) ──────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // We get chats where user is either buyer or seller
    const query = `
      SELECT c.*, 
        u_b.name as buyer_name, u_b.avatar as buyer_avatar, 
        u_s.name as seller_name, u_s.avatar as seller_avatar,
        (SELECT text FROM messages m WHERE m.chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages m WHERE m.chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.is_read = FALSE AND m.sender_id != ?) as unread_count
      FROM chats c
      JOIN users u_b ON c.buyer_id = u_b.id
      JOIN users u_s ON c.seller_id = u_s.id
      WHERE c.buyer_id = ? OR c.seller_id = ?
      ORDER BY last_message_time DESC
    `;
    const [chats] = await pool.query(query, [userId, userId, userId]);
    res.json({ success: true, chats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/chats (Create or get existing chat) ─────────
router.post('/', verifyToken,
  [
    body('seller_id').isInt().withMessage('Seller ID diperlukan'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const buyerId = req.user.id;
    const sellerId = req.body.seller_id;

    if (buyerId === sellerId) {
      return res.status(400).json({ success: false, message: 'Tidak bisa chat dengan diri sendiri' });
    }

    try {
      // Check if chat exists
      const [existing] = await pool.query('SELECT id FROM chats WHERE buyer_id = ? AND seller_id = ?', [buyerId, sellerId]);
      if (existing.length > 0) {
        return res.json({ success: true, chat_id: existing[0].id });
      }

      // Create new chat
      const [result] = await pool.query('INSERT INTO chats (buyer_id, seller_id) VALUES (?, ?)', [buyerId, sellerId]);
      res.status(201).json({ success: true, chat_id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── GET /api/chats/:id/messages (Get messages) ────────────
router.get('/:id/messages', verifyToken, async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;

    // Verify user is part of the chat
    const [chatAuth] = await pool.query('SELECT id FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)', [chatId, userId, userId]);
    if (chatAuth.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const [messages] = await pool.query('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC', [chatId]);
    
    // Mark unread messages as read
    await pool.query('UPDATE messages SET is_read = TRUE WHERE chat_id = ? AND sender_id != ? AND is_read = FALSE', [chatId, userId]);

    res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
