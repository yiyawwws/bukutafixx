const pool = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// SELLER — Bank Account Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/withdrawal/bank-accounts
 * Seller: list own bank accounts
 */
exports.getMyBankAccounts = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT * FROM seller_bank_accounts WHERE seller_id = ? ORDER BY is_primary DESC, created_at DESC`,
      [sellerId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[getMyBankAccounts]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/withdrawal/bank-accounts
 * Seller: add a new bank account
 */
exports.addBankAccount = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { bank_name, account_number, account_holder_name, is_primary } = req.body;

    if (!bank_name || !account_number || !account_holder_name) {
      return res.status(422).json({
        success: false,
        message: 'Nama bank, nomor rekening, dan nama pemilik rekening wajib diisi',
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // If this is marked as primary, unset all existing primary accounts
      if (is_primary) {
        await connection.query(
          `UPDATE seller_bank_accounts SET is_primary = FALSE WHERE seller_id = ?`,
          [sellerId]
        );
      }

      // Check if this is the seller's first account — auto-set as primary
      const [[{ count }]] = await connection.query(
        `SELECT COUNT(*) as count FROM seller_bank_accounts WHERE seller_id = ?`,
        [sellerId]
      );
      const shouldBePrimary = is_primary || count === 0;

      const [result] = await connection.query(
        `INSERT INTO seller_bank_accounts (seller_id, bank_name, account_number, account_holder_name, is_primary)
         VALUES (?, ?, ?, ?, ?)`,
        [sellerId, bank_name.trim(), account_number.trim(), account_holder_name.trim(), shouldBePrimary]
      );

      await connection.commit();
      const [newRow] = await pool.query(`SELECT * FROM seller_bank_accounts WHERE id = ?`, [result.insertId]);
      res.status(201).json({ success: true, message: 'Rekening berhasil ditambahkan', data: newRow[0] });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[addBankAccount]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/withdrawal/bank-accounts/:id
 * Seller: update own bank account
 */
exports.updateBankAccount = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const accountId = parseInt(req.params.id);
    const { bank_name, account_number, account_holder_name } = req.body;

    const [rows] = await pool.query(
      `SELECT * FROM seller_bank_accounts WHERE id = ? AND seller_id = ?`,
      [accountId, sellerId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rekening tidak ditemukan' });
    }

    const updates = [];
    const params = [];
    if (bank_name)           { updates.push('bank_name = ?');           params.push(bank_name.trim()); }
    if (account_number)      { updates.push('account_number = ?');      params.push(account_number.trim()); }
    if (account_holder_name) { updates.push('account_holder_name = ?'); params.push(account_holder_name.trim()); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });
    }

    // Updating bank details resets verification
    updates.push('is_verified = FALSE', 'verified_at = NULL');
    params.push(accountId);

    await pool.query(`UPDATE seller_bank_accounts SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await pool.query(`SELECT * FROM seller_bank_accounts WHERE id = ?`, [accountId]);
    res.json({ success: true, message: 'Rekening berhasil diperbarui', data: updated[0] });
  } catch (err) {
    console.error('[updateBankAccount]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/withdrawal/bank-accounts/:id/primary
 * Seller: set a bank account as primary
 */
exports.setPrimaryBankAccount = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const accountId = parseInt(req.params.id);

    const [rows] = await pool.query(
      `SELECT id FROM seller_bank_accounts WHERE id = ? AND seller_id = ?`,
      [accountId, sellerId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rekening tidak ditemukan' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE seller_bank_accounts SET is_primary = FALSE WHERE seller_id = ?`,
        [sellerId]
      );
      await connection.query(
        `UPDATE seller_bank_accounts SET is_primary = TRUE WHERE id = ?`,
        [accountId]
      );
      await connection.commit();
      res.json({ success: true, message: 'Rekening utama berhasil diperbarui' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[setPrimaryBankAccount]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SELLER — Withdrawal Requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/withdrawal/request
 * Seller: request a withdrawal from available_balance
 */
exports.requestWithdrawal = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { amount, bank_account_id } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(422).json({ success: false, message: 'Jumlah penarikan tidak valid' });
    }

    const withdrawAmount = parseFloat(amount);

    // Check bank account
    const [bankRows] = await pool.query(
      `SELECT * FROM seller_bank_accounts WHERE id = ? AND seller_id = ?`,
      [bank_account_id, sellerId]
    );
    if (bankRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Rekening bank tidak ditemukan' });
    }

    // Check seller wallet
    const [walletRows] = await pool.query(
      `SELECT * FROM seller_wallets WHERE seller_id = ?`,
      [sellerId]
    );
    if (walletRows.length === 0 || parseFloat(walletRows[0].balance_available) < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: 'Saldo tidak mencukupi untuk melakukan penarikan',
      });
    }

    // Check no pending request already
    const [pendingRows] = await pool.query(
      `SELECT id FROM withdrawal_requests WHERE seller_id = ? AND status = 'pending'`,
      [sellerId]
    );
    if (pendingRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Masih ada permintaan penarikan yang sedang menunggu persetujuan',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO withdrawal_requests (seller_id, bank_account_id, amount, status, requested_at)
       VALUES (?, ?, ?, 'pending', NOW())`,
      [sellerId, bank_account_id, withdrawAmount]
    );

    const [newRow] = await pool.query(`SELECT * FROM withdrawal_requests WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, message: 'Permintaan penarikan berhasil dikirim', data: newRow[0] });
  } catch (err) {
    console.error('[requestWithdrawal]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/withdrawal/history
 * Seller: list own withdrawal history
 */
exports.getMyWithdrawals = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT wr.*,
              sba.bank_name, sba.account_number, sba.account_holder_name
       FROM withdrawal_requests wr
       LEFT JOIN seller_bank_accounts sba ON wr.bank_account_id = sba.id
       WHERE wr.seller_id = ?
       ORDER BY wr.created_at DESC`,
      [sellerId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[getMyWithdrawals]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Bank Account Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/withdrawal/admin/bank-accounts
 * Admin: list all seller bank accounts
 */
exports.adminGetBankAccounts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR sba.bank_name LIKE ? OR sba.account_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT sba.*,
              u.name AS seller_name, u.email AS seller_email
       FROM seller_bank_accounts sba
       JOIN users u ON sba.seller_id = u.id
       ${where}
       ORDER BY sba.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM seller_bank_accounts sba JOIN users u ON sba.seller_id = u.id ${where}`,
      params
    );

    res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[adminGetBankAccounts]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/withdrawal/admin/bank-accounts/:id/verify
 * Admin: toggle verification status of a bank account
 */
exports.adminVerifyBankAccount = async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const [rows] = await pool.query(`SELECT * FROM seller_bank_accounts WHERE id = ?`, [accountId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rekening tidak ditemukan' });
    }

    const newVerified = !rows[0].is_verified;
    await pool.query(
      `UPDATE seller_bank_accounts SET is_verified = ?, verified_at = ? WHERE id = ?`,
      [newVerified, newVerified ? new Date() : null, accountId]
    );

    res.json({
      success: true,
      message: newVerified ? 'Rekening berhasil diverifikasi' : 'Verifikasi rekening dibatalkan',
      is_verified: newVerified,
    });
  } catch (err) {
    console.error('[adminVerifyBankAccount]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Withdrawal Request Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/withdrawal/admin/requests
 * Admin: list all withdrawal requests
 */
exports.adminGetWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];
    if (status && ['pending', 'approved', 'paid', 'rejected'].includes(status)) {
      where += ' AND wr.status = ?';
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT wr.*,
              u.name AS seller_name, u.email AS seller_email,
              sba.bank_name, sba.account_number, sba.account_holder_name, sba.is_verified AS bank_verified
       FROM withdrawal_requests wr
       JOIN users u ON wr.seller_id = u.id
       LEFT JOIN seller_bank_accounts sba ON wr.bank_account_id = sba.id
       ${where}
       ORDER BY wr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM withdrawal_requests wr JOIN users u ON wr.seller_id = u.id ${where}`,
      params
    );

    res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[adminGetWithdrawals]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/withdrawal/admin/requests/:id/approve
 * Admin: approve a withdrawal request
 */
exports.adminApproveWithdrawal = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const [rows] = await pool.query(`SELECT * FROM withdrawal_requests WHERE id = ?`, [requestId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Permintaan tidak ditemukan' });
    }
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: `Status saat ini adalah '${rows[0].status}', bukan 'pending'` });
    }

    await pool.query(
      `UPDATE withdrawal_requests SET status = 'approved', approved_at = NOW() WHERE id = ?`,
      [requestId]
    );
    res.json({ success: true, message: 'Permintaan penarikan disetujui' });
  } catch (err) {
    console.error('[adminApproveWithdrawal]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/withdrawal/admin/requests/:id/reject
 * Admin: reject a withdrawal request with a note
 */
exports.adminRejectWithdrawal = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { admin_note } = req.body;

    const [rows] = await pool.query(`SELECT * FROM withdrawal_requests WHERE id = ?`, [requestId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Permintaan tidak ditemukan' });
    }
    if (!['pending', 'approved'].includes(rows[0].status)) {
      return res.status(400).json({ success: false, message: `Tidak bisa menolak permintaan dengan status '${rows[0].status}'` });
    }

    await pool.query(
      `UPDATE withdrawal_requests SET status = 'rejected', admin_note = ?, rejected_at = NOW() WHERE id = ?`,
      [admin_note || null, requestId]
    );
    res.json({ success: true, message: 'Permintaan penarikan ditolak' });
  } catch (err) {
    console.error('[adminRejectWithdrawal]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/withdrawal/admin/requests/:id/paid
 * Admin: mark withdrawal as paid, upload transfer proof, deduct seller balance
 */
exports.adminMarkPaid = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const requestId = parseInt(req.params.id);

    const [rows] = await pool.query(
      `SELECT wr.*, sba.seller_id FROM withdrawal_requests wr
       LEFT JOIN seller_bank_accounts sba ON wr.bank_account_id = sba.id
       WHERE wr.id = ?`,
      [requestId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Permintaan tidak ditemukan' });
    }
    if (rows[0].status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Status harus 'approved' sebelum bisa ditandai sebagai paid. Status saat ini: '${rows[0].status}'`,
      });
    }

    const request = rows[0];
    const transferProofUrl = req.file ? req.file.path : null;

    await connection.beginTransaction();

    // Deduct seller balance and increment total_withdrawn atomically
    const [walletResult] = await connection.query(
      `UPDATE seller_wallets
       SET balance_available = balance_available - ?,
           total_withdrawn   = total_withdrawn   + ?
       WHERE seller_id = ? AND balance_available >= ?`,
      [request.amount, request.amount, request.seller_id, request.amount]
    );

    if (walletResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Saldo seller tidak mencukupi untuk menyelesaikan penarikan ini',
      });
    }

    // Mark withdrawal as paid
    await connection.query(
      `UPDATE withdrawal_requests SET status = 'paid', transfer_proof = ?, paid_at = NOW() WHERE id = ?`,
      [transferProofUrl, requestId]
    );

    await connection.commit();
    res.json({ success: true, message: 'Penarikan ditandai sebagai sudah dibayar', transfer_proof: transferProofUrl });
  } catch (err) {
    await connection.rollback();
    console.error('[adminMarkPaid]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/withdrawal/seller/wallet
 * Seller: get wallet balance summary
 */
exports.getMyWallet = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Ensure wallet row exists
    await pool.query(
      `INSERT IGNORE INTO seller_wallets (seller_id, balance_available, balance_hold, total_earned)
       VALUES (?, 0, 0, 0)`,
      [sellerId]
    );

    const [walletRows] = await pool.query(
      `SELECT balance_available, balance_hold, total_earned,
              COALESCE(total_withdrawn, 0) AS total_withdrawn
       FROM seller_wallets WHERE seller_id = ?`,
      [sellerId]
    );

    const wallet = walletRows[0] || {
      balance_available: 0,
      balance_hold: 0,
      total_earned: 0,
      total_withdrawn: 0,
    };

    // Also get primary bank account
    const [bankRows] = await pool.query(
      `SELECT * FROM seller_bank_accounts WHERE seller_id = ? AND is_primary = TRUE LIMIT 1`,
      [sellerId]
    );

    res.json({
      success: true,
      data: {
        wallet: {
          available_balance: parseFloat(wallet.balance_available),
          pending_balance:   parseFloat(wallet.balance_hold),
          total_earned:      parseFloat(wallet.total_earned),
          total_withdrawn:   parseFloat(wallet.total_withdrawn),
        },
        primary_bank_account: bankRows[0] || null,
      },
    });
  } catch (err) {
    console.error('[getMyWallet]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
