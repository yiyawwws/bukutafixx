import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { withdrawalService } from '../../services/withdrawalService';
import Typography from '../../components/atoms/Typography';
import Spinner from '../../components/atoms/Spinner';
import Button from '../../components/atoms/Button';
import Badge from '../../components/atoms/Badge';
import {
  Wallet, TrendingUp, Clock, ArrowDownCircle,
  Building2, CreditCard, AlertCircle, ArrowRight,
} from 'lucide-react';
import '../admin/AdminPages.css';

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const SellerBalance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const res = await withdrawalService.getWallet();
      if (res.success) setData(res.data);
      else setError(res.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat saldo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" color="primary" /></div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center' }}><Typography color="error">{error}</Typography></div>;

  const wallet = data?.wallet || {};
  const bank = data?.primary_bank_account;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Typography variant="h3" weight="bold">Saldo Saya</Typography>
          <Typography variant="body" color="muted">Ringkasan saldo dan informasi penarikan dana</Typography>
        </div>
        <Link to="/seller/withdrawal">
          <Button variant="primary" size="sm" id="btn-request-withdrawal">
            <ArrowDownCircle size={15} style={{ marginRight: 6 }} />
            Tarik Dana
          </Button>
        </Link>
      </div>

      {/* Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <BalanceCard
          icon={<Wallet size={22} color="#22c55e" />}
          label="Saldo Tersedia"
          value={formatIDR(wallet.available_balance)}
          accent="#22c55e"
          id="card-available-balance"
        />
        <BalanceCard
          icon={<Clock size={22} color="#f59e0b" />}
          label="Dana Tertahan (Escrow)"
          value={formatIDR(wallet.pending_balance)}
          accent="#f59e0b"
          id="card-pending-balance"
        />
        <BalanceCard
          icon={<TrendingUp size={22} color="#1877F2" />}
          label="Total Penghasilan"
          value={formatIDR(wallet.total_earned)}
          accent="#1877F2"
          id="card-total-earned"
        />
        <BalanceCard
          icon={<ArrowDownCircle size={22} color="#8b5cf6" />}
          label="Total Ditarik"
          value={formatIDR(wallet.total_withdrawn)}
          accent="#8b5cf6"
          id="card-total-withdrawn"
        />
      </div>

      {/* Bank Account Info */}
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Typography variant="h5" weight="bold">Rekening Utama</Typography>
          <Link to="/seller/bank-account">
            <button style={linkBtnStyle} id="btn-manage-bank-account">
              Kelola Rekening <ArrowRight size={13} />
            </button>
          </Link>
        </div>

        {bank ? (
          <div style={bankCardStyle}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Building2 size={20} color="#1877F2" />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>{bank.bank_name}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <CreditCard size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {bank.account_number} — {bank.account_holder_name}
                </p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                {bank.is_verified
                  ? <Badge variant="success">Terverifikasi</Badge>
                  : <Badge variant="warning">Belum Diverifikasi</Badge>
                }
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'var(--color-surface-50)', borderRadius: 10, border: '1.5px dashed var(--color-surface-200)' }}>
            <AlertCircle size={32} color="#f59e0b" style={{ marginBottom: 8 }} />
            <Typography variant="body" weight="bold">Belum ada rekening bank</Typography>
            <Typography color="muted" variant="small">Tambahkan rekening bank untuk bisa menarik dana dari saldo kamu.</Typography>
            <Link to="/seller/bank-account">
              <Button variant="primary" size="sm" style={{ marginTop: '0.75rem' }} id="btn-add-bank-from-balance">
                Tambah Rekening
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* CTA */}
      {wallet.available_balance > 0 && bank && (
        <div style={{ background: 'linear-gradient(135deg, #1877F2, #0ea5e9)', borderRadius: 14, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Saldo kamu siap ditarik!</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
              Saldo tersedia: <strong>{formatIDR(wallet.available_balance)}</strong>
            </p>
          </div>
          <Link to="/seller/withdrawal">
            <Button style={{ background: '#fff', color: '#1877F2', fontWeight: 700 }} size="sm" id="btn-withdraw-cta">
              Tarik Dana Sekarang
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

const BalanceCard = ({ icon, label, value, accent, id }) => (
  <div
    id={id}
    style={{
      background: 'var(--color-surface-100)',
      border: '1px solid var(--color-surface-200)',
      borderLeft: `4px solid ${accent}`,
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {icon}
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>{value}</span>
  </div>
);

const bankCardStyle = {
  background: 'var(--color-surface-50)',
  border: '1px solid var(--color-surface-200)',
  borderRadius: 10,
  padding: '1rem',
};

const linkBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  fontSize: '0.8rem', fontWeight: 600, color: '#1877F2',
  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
};

export default SellerBalance;
