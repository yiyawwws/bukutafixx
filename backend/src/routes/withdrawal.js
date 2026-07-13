const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { requireRole, requireActiveRole } = require('../middleware/role');
const uploadTransferProof = require('../middleware/uploadTransferProof');
const W = require('../controllers/WithdrawalController');

const router = express.Router();

// ─── Seller: Bank Accounts ────────────────────────────────────────────────────
router.get('/bank-accounts',
  verifyToken,
  W.getMyBankAccounts
);

router.post('/bank-accounts',
  verifyToken,
  W.addBankAccount
);

router.put('/bank-accounts/:id',
  verifyToken,
  W.updateBankAccount
);

router.put('/bank-accounts/:id/primary',
  verifyToken,
  W.setPrimaryBankAccount
);

// ─── Seller: Wallet & Withdrawals ─────────────────────────────────────────────
router.get('/wallet',
  verifyToken,
  W.getMyWallet
);

router.post('/request',
  verifyToken,
  W.requestWithdrawal
);

router.get('/history',
  verifyToken,
  W.getMyWithdrawals
);

// ─── Admin: Bank Accounts ─────────────────────────────────────────────────────
router.get('/admin/bank-accounts',
  verifyToken, requireRole('admin'),
  W.adminGetBankAccounts
);

router.put('/admin/bank-accounts/:id/verify',
  verifyToken, requireRole('admin'),
  W.adminVerifyBankAccount
);

// ─── Admin: Withdrawal Requests ───────────────────────────────────────────────
router.get('/admin/requests',
  verifyToken, requireRole('admin'),
  W.adminGetWithdrawals
);

router.put('/admin/requests/:id/approve',
  verifyToken, requireRole('admin'),
  W.adminApproveWithdrawal
);

router.put('/admin/requests/:id/reject',
  verifyToken, requireRole('admin'),
  W.adminRejectWithdrawal
);

router.put('/admin/requests/:id/paid',
  verifyToken, requireRole('admin'),
  uploadTransferProof.single('transfer_proof'),
  W.adminMarkPaid
);

module.exports = router;
