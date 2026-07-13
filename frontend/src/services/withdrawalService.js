import api from './api';

// ─── Seller: Wallet ───────────────────────────────────────────────────────────
export const withdrawalService = {
  // GET wallet balance summary
  getWallet: () => api.get('/withdrawal/wallet').then(r => r.data),

  // ─── Seller: Bank Accounts ──────────────────────────────────────────────────
  getBankAccounts: () => api.get('/withdrawal/bank-accounts').then(r => r.data),

  addBankAccount: (data) => api.post('/withdrawal/bank-accounts', data).then(r => r.data),

  updateBankAccount: (id, data) => api.put(`/withdrawal/bank-accounts/${id}`, data).then(r => r.data),

  setPrimaryBankAccount: (id) => api.put(`/withdrawal/bank-accounts/${id}/primary`).then(r => r.data),

  // ─── Seller: Withdrawal History ─────────────────────────────────────────────
  requestWithdrawal: (data) => api.post('/withdrawal/request', data).then(r => r.data),

  getHistory: () => api.get('/withdrawal/history').then(r => r.data),

  // ─── Admin: Bank Accounts ───────────────────────────────────────────────────
  adminGetBankAccounts: (params) => api.get('/withdrawal/admin/bank-accounts', { params }).then(r => r.data),

  adminVerifyBankAccount: (id) => api.put(`/withdrawal/admin/bank-accounts/${id}/verify`).then(r => r.data),

  // ─── Admin: Withdrawal Requests ─────────────────────────────────────────────
  adminGetWithdrawals: (params) => api.get('/withdrawal/admin/requests', { params }).then(r => r.data),

  adminApprove: (id) => api.put(`/withdrawal/admin/requests/${id}/approve`).then(r => r.data),

  adminReject: (id, admin_note) => api.put(`/withdrawal/admin/requests/${id}/reject`, { admin_note }).then(r => r.data),

  adminMarkPaid: (id, formData) =>
    api.put(`/withdrawal/admin/requests/${id}/paid`, formData).then(r => r.data),
};

export default withdrawalService;
