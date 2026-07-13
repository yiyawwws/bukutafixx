import React, { useState, useEffect } from 'react';
import Typography from '../atoms/Typography';
import Button from '../atoms/Button';
import Spinner from '../atoms/Spinner';
import { withdrawalService } from '../../services/withdrawalService';
import { X, Banknote, AlertCircle, CheckCircle } from 'lucide-react';
import './ReviewModal.css'; // Reusing similar modal styles

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const COMMON_BANKS = [
  'Bank BCA',
  'Bank Mandiri',
  'Bank BNI',
  'Bank BRI',
  'Bank Syariah Indonesia (BSI)',
  'Bank CIMB Niaga',
  'Bank Permata',
  'Bank Danamon',
  'SeaBank',
  'Bank Jago',
  'GoPay',
  'OVO',
  'DANA',
  'ShopeePay',
  'Lainnya'
];

const WithdrawRefundModal = ({ order, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [wallet, setWallet] = useState(null);
  
  const [form, setForm] = useState({
    bank_name: '',
    account_number: '',
    account_holder_name: ''
  });

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await withdrawalService.getWallet();
        if (res.success) {
          setWallet(res.data.wallet);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal mengambil informasi saldo.');
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bank_name || !form.account_number || !form.account_holder_name) {
      setError('Semua field bank harus diisi.');
      return;
    }

    if (wallet?.available_balance <= 0) {
      setError('Saldo tidak mencukupi atau sudah ditarik.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // 1. Add Bank Account
      const bankRes = await withdrawalService.addBankAccount({
        ...form,
        is_primary: true
      });
      
      const newBankId = bankRes.data.id;

      // 2. Request Withdrawal for the available balance
      await withdrawalService.requestWithdrawal({
        amount: wallet.available_balance,
        bank_account_id: newBankId
      });

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memproses penarikan dana.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal-content" onClick={e => e.stopPropagation()}>
        <div className="review-modal-header">
          <Typography variant="h5" weight="bold">Tarik Dana Refund</Typography>
          <button className="review-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="review-modal-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Spinner size="md" color="primary" />
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '1rem' }} />
              <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>Berhasil Diajukan</Typography>
              <Typography color="muted" style={{ marginBottom: '1.5rem' }}>
                Permintaan penarikan dana berhasil dikirim dan akan segera diproses oleh admin.
              </Typography>
              <Button variant="primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
                Tutup
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Banknote size={32} color="#22c55e" />
                <div>
                  <Typography variant="small" color="muted">Total Saldo Refund Tersedia</Typography>
                  <Typography variant="h4" weight="bold" style={{ color: '#22c55e', margin: 0 }}>
                    {formatIDR(wallet?.available_balance || 0)}
                  </Typography>
                </div>
              </div>

              {(wallet?.available_balance || 0) <= 0 ? (
                <div style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <Typography variant="small">Saldo refund Anda kosong. Kemungkinan dana sudah ditarik atau sedang dalam proses penarikan.</Typography>
                </div>
              ) : (
                <>
                  <Typography variant="body" style={{ marginBottom: '1.25rem', color: 'var(--color-text-secondary)' }}>
                    Masukkan rekening tujuan untuk menarik dana refund Anda. Seluruh saldo tersedia akan ditarik ke rekening ini.
                  </Typography>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Nama Bank / E-Wallet</label>
                    <select
                      className="form-input"
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-50)' }}
                      value={COMMON_BANKS.includes(form.bank_name) ? form.bank_name : (form.bank_name ? 'Lainnya' : '')}
                      onChange={e => {
                        if (e.target.value === 'Lainnya') {
                          setForm({ ...form, bank_name: '' });
                        } else {
                          setForm({ ...form, bank_name: e.target.value });
                        }
                      }}
                      required
                    >
                      <option value="" disabled>Pilih Bank / E-Wallet</option>
                      {COMMON_BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    
                    {(!COMMON_BANKS.includes(form.bank_name) && form.bank_name !== '' || !COMMON_BANKS.includes(form.bank_name)) && (
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-50)', marginTop: '0.75rem' }}
                        placeholder="Ketik nama bank lainnya..."
                        value={form.bank_name}
                        onChange={e => setForm({ ...form, bank_name: e.target.value })}
                        required
                      />
                    )}
                  </div>
                  
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Nomor Rekening / No. HP E-Wallet</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-50)' }}
                      placeholder="Contoh: 1234567890"
                      value={form.account_number}
                      onChange={e => setForm({ ...form, account_number: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Nama Pemilik Rekening</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-50)' }}
                      placeholder="Sesuai buku tabungan atau e-wallet"
                      value={form.account_holder_name}
                      onChange={e => setForm({ ...form, account_holder_name: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '8px' }}>
                  <AlertCircle size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
                  <span style={{ verticalAlign: 'middle' }}>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button type="button" variant="outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Batal</Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  style={{ flex: 1, justifyContent: 'center' }} 
                  disabled={submitting || (wallet?.available_balance || 0) <= 0}
                  isLoading={submitting}
                >
                  Tarik Dana
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithdrawRefundModal;
