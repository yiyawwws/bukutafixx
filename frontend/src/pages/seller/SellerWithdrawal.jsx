import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { withdrawalService } from '../../services/withdrawalService';
import { viewSecureFile } from '../../services/api';
import Typography from '../../components/atoms/Typography';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import Badge from '../../components/atoms/Badge';
import {
  ArrowDownCircle, Clock, CheckCircle, XCircle,
  Banknote, AlertCircle, ExternalLink, Building2,
} from 'lucide-react';
import '../admin/AdminPages.css';

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const statusMap = {
  pending:  { label: 'Menunggu',   variant: 'warning', icon: <Clock size={13} /> },
  approved: { label: 'Disetujui',  variant: 'info',    icon: <CheckCircle size={13} /> },
  paid:     { label: 'Sudah Dibayar', variant: 'success', icon: <Banknote size={13} /> },
  rejected: { label: 'Ditolak',    variant: 'error',   icon: <XCircle size={13} /> },
};

const SellerWithdrawal = () => {
  const [wallet, setWallet] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({ amount: '', bank_account_id: '' });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [walletRes, bankRes, historyRes] = await Promise.all([
        withdrawalService.getWallet(),
        withdrawalService.getBankAccounts(),
        withdrawalService.getHistory(),
      ]);
      if (walletRes.success) setWallet(walletRes.data);
      if (bankRes.success) {
        setAccounts(bankRes.data);
        // Pre-select primary account
        const primary = bankRes.data.find(a => a.is_primary);
        if (primary) setForm(f => ({ ...f, bank_account_id: String(primary.id) }));
      }
      if (historyRes.success) setHistory(historyRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const available = parseFloat(wallet?.wallet?.available_balance || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    const amount = parseFloat(form.amount);
    if (!form.bank_account_id) { setFormError('Pilih rekening bank tujuan'); return; }
    if (!amount || amount <= 0) { setFormError('Masukkan jumlah penarikan yang valid'); return; }
    if (amount > available) { setFormError(`Jumlah melebihi saldo tersedia (${formatIDR(available)})`); return; }

    setSubmitting(true);
    try {
      const res = await withdrawalService.requestWithdrawal({
        amount,
        bank_account_id: parseInt(form.bank_account_id),
      });
      if (res.success) {
        setSuccessMsg('Permintaan penarikan berhasil dikirim! Admin akan segera memprosesnya.');
        setForm({ amount: '', bank_account_id: form.bank_account_id });
        await loadAll();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal mengirim permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Spinner size="lg" color="primary" />
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <Typography color="error">{error}</Typography>
    </div>
  );

  const hasBankAccount = accounts.length > 0;
  const hasPendingRequest = history.some(h => h.status === 'pending');

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Typography variant="h3" weight="bold">Penarikan Dana</Typography>
          <Typography variant="body" color="muted">Ajukan penarikan dan lihat riwayat transaksi</Typography>
        </div>
        <Link to="/seller/balance">
          <button style={linkBtnStyle}>← Kembali ke Saldo</button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* ── Left: Request Form ── */}
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '1rem' }}>
            <ArrowDownCircle size={17} style={{ marginRight: 6, verticalAlign: 'middle', color: '#1877F2' }} />
            Ajukan Penarikan
          </Typography>

          {/* Saldo tersedia */}
          <div style={saldoBox}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo Tersedia</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>{formatIDR(available)}</span>
          </div>

          {!hasBankAccount ? (
            <div style={alertBox('#f59e0b')}>
              <AlertCircle size={18} color="#f59e0b" />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Belum ada rekening bank</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Tambahkan rekening bank terlebih dahulu sebelum melakukan penarikan.
                </p>
                <Link to="/seller/bank-account">
                  <Button variant="primary" size="sm" style={{ marginTop: '0.5rem' }} id="btn-add-bank-prompt">
                    Tambah Rekening
                  </Button>
                </Link>
              </div>
            </div>
          ) : hasPendingRequest ? (
            <div style={alertBox('#f59e0b')}>
              <Clock size={18} color="#f59e0b" />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Ada permintaan yang sedang diproses</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Kamu sudah memiliki permintaan penarikan yang masih menunggu persetujuan.
                </p>
              </div>
            </div>
          ) : available <= 0 ? (
            <div style={alertBox('#6b7280')}>
              <AlertCircle size={18} color="#6b7280" />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Saldo tidak mencukupi</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Saldo tersedia kamu saat ini adalah Rp 0.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Bank Account */}
              <div>
                <label style={labelStyle}>Rekening Tujuan *</label>
                <select
                  value={form.bank_account_id}
                  onChange={e => setForm({ ...form, bank_account_id: e.target.value })}
                  style={inputStyle}
                  id="select-withdrawal-account"
                  required
                >
                  <option value="">-- Pilih Rekening --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank_name} — {acc.account_number} ({acc.account_holder_name})
                      {acc.is_primary ? ' ⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={labelStyle}>Jumlah Penarikan *</label>
                <div style={{ position: 'relative' }}>
                  <span style={prefixStyle}>Rp</span>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    max={available}
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                    placeholder="Contoh: 100000"
                    id="input-withdrawal-amount"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amount: String(Math.floor(available)) })}
                  style={{ fontSize: '0.75rem', color: '#1877F2', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.25rem', padding: 0 }}
                >
                  Tarik semua ({formatIDR(available)})
                </button>
              </div>

              {formError && (
                <p style={{ color: 'var(--color-error, #ef4444)', fontSize: '0.85rem', margin: 0 }}>{formError}</p>
              )}
              {successMsg && (
                <p style={{ color: '#22c55e', fontSize: '0.85rem', margin: 0 }}>{successMsg}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                id="btn-submit-withdrawal"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {submitting ? 'Mengirim...' : 'Ajukan Penarikan'}
              </Button>
            </form>
          )}
        </div>

        {/* ── Right: History ── */}
        <div className="admin-card">
          <div style={{ padding: '1.25rem 1.25rem 0' }}>
            <Typography variant="h5" weight="bold">Riwayat Penarikan</Typography>
          </div>

          {history.length === 0 ? (
            <div className="admin-empty">
              <Banknote size={40} color="var(--color-surface-400)" />
              <Typography variant="h5" className="mt-4">Belum ada riwayat</Typography>
              <Typography color="muted">Permintaan penarikan yang kamu ajukan akan muncul di sini.</Typography>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Rekening</th>
                    <th>Status</th>
                    <th>Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => {
                    const s = statusMap[item.status] || { label: item.status, variant: 'default', icon: null };
                    return (
                      <tr key={item.id}>
                        <td>
                          <Typography variant="small">{new Date(item.requested_at).toLocaleDateString('id-ID')}</Typography>
                        </td>
                        <td>
                          <Typography variant="small" weight="bold">{formatIDR(item.amount)}</Typography>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Building2 size={13} color="var(--color-text-muted)" />
                            <span style={{ fontSize: '0.8rem' }}>{item.bank_name}</span>
                          </div>
                          <Typography variant="xs" color="muted">{item.account_number}</Typography>
                        </td>
                        <td>
                          <Badge variant={s.variant}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              {s.icon}{s.label}
                            </span>
                          </Badge>
                          {item.status === 'rejected' && item.admin_note && (
                            <Typography variant="xs" color="error" style={{ marginTop: 3 }}>
                              {item.admin_note}
                            </Typography>
                          )}
                        </td>
                        <td>
                          {item.transfer_proof ? (
                            <button
                              type="button"
                              onClick={() => viewSecureFile(item.transfer_proof)}
                              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#1877F2', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            >
                              <ExternalLink size={12} /> Lihat
                            </button>
                          ) : (
                            <Typography variant="xs" color="muted">—</Typography>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const saldoBox = {
  background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
  border: '1px solid rgba(34,197,94,0.25)',
  borderRadius: 10,
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginBottom: '1rem',
};

const alertBox = (color) => ({
  background: `rgba(${color === '#f59e0b' ? '245,158,11' : '107,114,128'},0.08)`,
  border: `1px solid ${color}40`,
  borderRadius: 10,
  padding: '0.875rem 1rem',
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'flex-start',
  marginBottom: '0.5rem',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.875rem',
  borderRadius: '8px',
  border: '1.5px solid var(--color-surface-200)',
  background: 'var(--color-surface-50)',
  color: 'var(--color-text-main)',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
};

const prefixStyle = {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--color-text-muted)',
  fontSize: '0.9rem',
  fontWeight: 600,
  pointerEvents: 'none',
};

const linkBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)',
  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
};

export default SellerWithdrawal;
