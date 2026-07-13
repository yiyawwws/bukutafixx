import React, { useState, useEffect } from 'react';
import { withdrawalService } from '../../services/withdrawalService';
import Typography from '../../components/atoms/Typography';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import Badge from '../../components/atoms/Badge';
import { useToast } from '../../context/ToastContext';
import { Building2, CreditCard, User, Plus, Pencil, Star, CheckCircle, XCircle } from 'lucide-react';
import '../admin/AdminPages.css';

const BANK_OPTIONS = [
  'BCA', 'BNI', 'BRI', 'Mandiri', 'CIMB Niaga', 'Danamon', 'Permata Bank',
  'Bank Syariah Indonesia (BSI)', 'Bank Jago', 'Jenius (BTPN)', 'Gopay',
  'OVO', 'Dana', 'ShopeePay', 'Lainnya',
];

const emptyForm = { bank_name: '', account_number: '', account_holder_name: '' };

const BuyerBankAccount = () => {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await withdrawalService.getBankAccounts();
      if (res.success) setAccounts(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat rekening');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (acc) => {
    setEditingId(acc.id);
    setForm({ bank_name: acc.bank_name, account_number: acc.account_number, account_holder_name: acc.account_holder_name });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bank_name || !form.account_number || !form.account_holder_name) {
      setFormError('Semua field wajib diisi');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await withdrawalService.updateBankAccount(editingId, form);
      } else {
        await withdrawalService.addBankAccount(form);
      }
      setShowForm(false);
      await fetchAccounts();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan rekening');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await withdrawalService.setPrimaryBankAccount(id);
      await fetchAccounts();
      toast.success('Rekening utama berhasil diubah.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengatur rekening utama');
    }
  };

  const fmt = (label) => label;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Typography variant="h3" weight="bold">Rekening Bank</Typography>
          <Typography variant="body" color="muted">Kelola informasi rekening bank untuk penarikan dana</Typography>
        </div>
        <Button variant="primary" size="sm" onClick={openAdd} id="btn-add-bank-account">
          <Plus size={15} style={{ marginRight: 6 }} />
          Tambah Rekening
        </Button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="img-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="img-modal-box" style={{ width: 'min(95vw, 520px)' }} onClick={e => e.stopPropagation()}>
            <div className="img-modal-header">
              <span className="img-modal-title">
                {editingId ? 'Edit Rekening' : 'Tambah Rekening Baru'}
              </span>
              <button className="img-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="img-modal-body" style={{ display: 'block', padding: '1.5rem' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Bank Name */}
                <div>
                  <label style={labelStyle}>Nama Bank *</label>
                  <select
                    value={form.bank_name}
                    onChange={e => setForm({ ...form, bank_name: e.target.value })}
                    style={inputStyle}
                    id="select-bank-name"
                    required
                  >
                    <option value="">-- Pilih Bank --</option>
                    {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {/* Account Number */}
                <div>
                  <label style={labelStyle}>Nomor Rekening *</label>
                  <input
                    type="text"
                    value={form.account_number}
                    onChange={e => setForm({ ...form, account_number: e.target.value })}
                    style={inputStyle}
                    placeholder="Contoh: 1234567890"
                    id="input-account-number"
                    required
                  />
                </div>
                {/* Account Holder */}
                <div>
                  <label style={labelStyle}>Nama Pemilik Rekening *</label>
                  <input
                    type="text"
                    value={form.account_holder_name}
                    onChange={e => setForm({ ...form, account_holder_name: e.target.value })}
                    style={inputStyle}
                    placeholder="Sesuai dengan nama di buku tabungan"
                    id="input-account-holder"
                    required
                  />
                </div>

                {editingId && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-warning, #f59e0b)', margin: 0 }}>
                    ⚠️ Mengubah data rekening akan mereset status verifikasi.
                  </p>
                )}

                {formError && (
                  <p style={{ color: 'var(--color-error, #ef4444)', fontSize: '0.85rem', margin: 0 }}>{formError}</p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Batal</Button>
                  <Button type="submit" variant="primary" size="sm" disabled={saving} id="btn-save-bank-account">
                    {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="admin-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" color="primary" />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </div>
        ) : accounts.length === 0 ? (
          <div className="admin-empty">
            <Building2 size={48} color="var(--color-surface-400)" />
            <Typography variant="h5" className="mt-4">Belum ada rekening</Typography>
            <Typography color="muted">Tambahkan rekening bank untuk bisa menarik dana.</Typography>
            <Button variant="primary" size="sm" onClick={openAdd} style={{ marginTop: '1rem' }}>
              <Plus size={14} style={{ marginRight: 6 }} /> Tambah Rekening
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
            {accounts.map(acc => (
              <div key={acc.id} style={cardStyle(acc.is_primary)}>
                {/* Primary badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {acc.is_primary && (
                      <Badge variant="primary" id={`badge-primary-${acc.id}`}>
                        <Star size={11} style={{ marginRight: 3 }} /> Utama
                      </Badge>
                    )}
                    {acc.is_verified ? (
                      <Badge variant="success" id={`badge-verified-${acc.id}`}>
                        <CheckCircle size={11} style={{ marginRight: 3 }} /> Terverifikasi
                      </Badge>
                    ) : (
                      <Badge variant="warning" id={`badge-unverified-${acc.id}`}>
                        <XCircle size={11} style={{ marginRight: 3 }} /> Belum Diverifikasi
                      </Badge>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!acc.is_primary && (
                      <button onClick={() => handleSetPrimary(acc.id)} style={ghostBtnStyle} id={`btn-set-primary-${acc.id}`}>
                        <Star size={13} /> Jadikan Utama
                      </button>
                    )}
                    <button onClick={() => openEdit(acc)} style={ghostBtnStyle} id={`btn-edit-${acc.id}`}>
                      <Pencil size={13} /> Edit
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <InfoRow icon={<Building2 size={14} />} label="Bank" value={acc.bank_name} />
                  <InfoRow icon={<CreditCard size={14} />} label="Nomor Rekening" value={acc.account_number} />
                  <InfoRow icon={<User size={14} />} label="Pemilik" value={acc.account_holder_name} />
                </div>

                {acc.is_verified && acc.verified_at && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0' }}>
                    Diverifikasi: {new Date(acc.verified_at).toLocaleDateString('id-ID')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
      {value}
    </span>
  </div>
);

const cardStyle = (isPrimary) => ({
  background: isPrimary ? 'linear-gradient(135deg, rgba(24,119,242,0.08), rgba(24,119,242,0.04))' : 'var(--color-surface-50, rgba(255,255,255,0.04))',
  border: `1.5px solid ${isPrimary ? 'rgba(24,119,242,0.35)' : 'var(--color-surface-200)'}`,
  borderRadius: '12px',
  padding: '1.25rem',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
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

const ghostBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  fontSize: '0.78rem', fontWeight: 600,
  padding: '0.3rem 0.65rem',
  borderRadius: '6px', border: '1px solid var(--color-surface-200)',
  background: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer',
};

export default BuyerBankAccount;
