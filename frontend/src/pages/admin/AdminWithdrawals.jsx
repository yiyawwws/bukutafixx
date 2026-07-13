import React, { useState, useEffect, useRef } from 'react';
import { withdrawalService } from '../../services/withdrawalService';
import { viewSecureFile } from '../../services/api';
import Typography from '../../components/atoms/Typography';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import Badge from '../../components/atoms/Badge';
import ConfirmDialog from '../../components/atoms/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import {
  CheckCircle, XCircle, Banknote, Clock, Building2,
  CreditCard, User, ExternalLink, Search, Filter, Upload,
} from 'lucide-react';
import './AdminPages.css';

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const statusMap = {
  pending:  { label: 'Menunggu',      variant: 'warning', icon: <Clock size={13} /> },
  approved: { label: 'Disetujui',     variant: 'info',    icon: <CheckCircle size={13} /> },
  paid:     { label: 'Sudah Dibayar', variant: 'success', icon: <Banknote size={13} /> },
  rejected: { label: 'Ditolak',       variant: 'error',   icon: <XCircle size={13} /> },
};

const TABS = ['Permintaan Penarikan', 'Rekening Bank Seller'];

const AdminWithdrawals = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);

  // ── Withdrawal state ────────────────────────────────────────────
  const [withdrawals, setWithdrawals] = useState([]);
  const [wLoading, setWLoading] = useState(true);
  const [wError, setWError] = useState(null);
  const [wStatusFilter, setWStatusFilter] = useState('');
  const [wPage, setWPage] = useState(1);
  const [wTotal, setWTotal] = useState(0);
  const LIMIT = 15;

  // Approve confirm dialog
  const [approveDialog, setApproveDialog] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // ── Bank Accounts state ─────────────────────────────────────────
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bLoading, setBLoading] = useState(true);
  const [bSearch, setBSearch] = useState('');
  const [bPage, setBPage] = useState(1);
  const [bTotal, setBTotal] = useState(0);

  // ── Reject Modal state ──────────────────────────────────────────
  const [rejectModal, setRejectModal] = useState(null); // { id }
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  // ── Mark Paid Modal state ───────────────────────────────────────
  const [paidModal, setPaidModal] = useState(null); // { id, amount, seller_name }
  const [proofFile, setProofFile] = useState(null);
  const [paidSaving, setPaidSaving] = useState(false);
  const [paidError, setPaidError] = useState('');
  const fileInputRef = useRef(null);

  // ────────────────────────────────────────────────────────────────

  const fetchWithdrawals = async () => {
    setWLoading(true); setWError(null);
    try {
      const res = await withdrawalService.adminGetWithdrawals({ status: wStatusFilter || undefined, page: wPage, limit: LIMIT });
      if (res.success) { setWithdrawals(res.data); setWTotal(res.total); }
    } catch (err) {
      setWError(err.response?.data?.message || 'Gagal memuat data');
    } finally { setWLoading(false); }
  };

  const fetchBankAccounts = async () => {
    setBLoading(true);
    try {
      const res = await withdrawalService.adminGetBankAccounts({ search: bSearch || undefined, page: bPage, limit: LIMIT });
      if (res.success) { setBankAccounts(res.data); setBTotal(res.total); }
    } catch (err) {
      console.error(err);
    } finally { setBLoading(false); }
  };

  useEffect(() => { fetchWithdrawals(); }, [wStatusFilter, wPage]);
  useEffect(() => { fetchBankAccounts(); }, [bSearch, bPage]);

  // ── Approve ────────────────────────────────────────────────────
  const handleApprove = (id) => setApproveDialog(id);

  const executeApprove = async () => {
    setApproveLoading(true);
    try {
      await withdrawalService.adminApprove(approveDialog);
      toast.success('Permintaan penarikan disetujui.');
      await fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui');
    } finally {
      setApproveLoading(false);
      setApproveDialog(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────
  const handleReject = async () => {
    setRejectSaving(true);
    try {
      await withdrawalService.adminReject(rejectModal.id, rejectNote);
      setRejectModal(null);
      setRejectNote('');
      toast.success('Permintaan penarikan ditolak.');
      await fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak');
    } finally { setRejectSaving(false); }
  };

  // ── Mark Paid ──────────────────────────────────────────────────
  const handleMarkPaid = async () => {
    setPaidError('');
    if (!proofFile) { setPaidError('Upload bukti transfer terlebih dahulu'); return; }
    setPaidSaving(true);
    try {
      const fd = new FormData();
      fd.append('transfer_proof', proofFile);
      await withdrawalService.adminMarkPaid(paidModal.id, fd);
      setPaidModal(null);
      setProofFile(null);
      await fetchWithdrawals();
    } catch (err) {
      setPaidError(err.response?.data?.message || 'Gagal memperbarui');
    } finally { setPaidSaving(false); }
  };

  // ── Verify Bank Account ───────────────────────────────────────
  const handleVerify = async (id) => {
    try {
      const res = await withdrawalService.adminVerifyBankAccount(id);
      toast.success(res.message || 'Status verifikasi rekening diperbarui.');
      await fetchBankAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal');
    }
  };

  return (
    <div className="admin-page">
      {/* ── Approve Confirm ── */}
      <ConfirmDialog
        open={!!approveDialog}
        variant="success"
        title="Setujui Penarikan?"
        message="Dana akan diproses dan diteruskan ke rekening seller. Pastikan rekening telah terverifikasi."
        confirmLabel="Ya, Setujui"
        cancelLabel="Batal"
        isLoading={approveLoading}
        onConfirm={executeApprove}
        onCancel={() => setApproveDialog(null)}
      />

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="img-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="img-modal-box" style={{ width: 'min(95vw, 480px)' }} onClick={e => e.stopPropagation()}>
            <div className="img-modal-header">
              <span className="img-modal-title">Tolak Permintaan Penarikan</span>
              <button className="img-modal-close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="img-modal-body" style={{ display: 'block', padding: '1.5rem' }}>
              <label style={labelStyle}>Alasan Penolakan (opsional)</label>
              <textarea
                rows={4}
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Masukkan alasan penolakan untuk dikirim ke seller..."
                id="textarea-reject-note"
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectModal(null)}>Batal</Button>
                <Button type="button" variant="primary" size="sm" style={{ background: '#ef4444' }} onClick={handleReject} disabled={rejectSaving} id="btn-confirm-reject">
                  {rejectSaving ? 'Menolak...' : 'Tolak Permintaan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ── */}
      {paidModal && (
        <div className="img-modal-overlay" onClick={() => { setPaidModal(null); setProofFile(null); setPaidError(''); }}>
          <div className="img-modal-box" style={{ width: 'min(95vw, 500px)' }} onClick={e => e.stopPropagation()}>
            <div className="img-modal-header">
              <span className="img-modal-title">Tandai Sudah Dibayar</span>
              <button className="img-modal-close" onClick={() => { setPaidModal(null); setProofFile(null); setPaidError(''); }}>✕</button>
            </div>
            <div className="img-modal-body" style={{ display: 'block', padding: '1.5rem' }}>
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '0.875rem', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Seller</p>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-main)' }}>{paidModal.seller_name}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#22c55e' }}>{formatIDR(paidModal.amount)}</p>
              </div>

              <label style={labelStyle}>Upload Bukti Transfer *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${proofFile ? '#22c55e' : 'var(--color-surface-200)'}`,
                  borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                  background: proofFile ? 'rgba(34,197,94,0.05)' : 'var(--color-surface-50)',
                  transition: 'all 0.2s',
                }}
                id="dropzone-transfer-proof"
              >
                <Upload size={24} color={proofFile ? '#22c55e' : 'var(--color-text-muted)'} style={{ marginBottom: 6 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: proofFile ? '#22c55e' : 'var(--color-text-muted)', fontWeight: proofFile ? 600 : 400 }}>
                  {proofFile ? proofFile.name : 'Klik untuk upload bukti transfer (JPG, PNG, WebP, PDF)'}
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setProofFile(e.target.files[0])} id="input-proof-file" />

              {paidError && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>{paidError}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button type="button" variant="outline" size="sm" onClick={() => { setPaidModal(null); setProofFile(null); setPaidError(''); }}>Batal</Button>
                <Button type="button" variant="primary" size="sm" onClick={handleMarkPaid} disabled={paidSaving || !proofFile} id="btn-confirm-paid">
                  {paidSaving ? 'Memproses...' : 'Konfirmasi Sudah Dibayar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="admin-page-header">
        <div>
          <Typography variant="h3" weight="bold">Manajemen Penarikan</Typography>
          <Typography variant="body" color="muted">Kelola permintaan penarikan dana dan rekening bank seller</Typography>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--color-surface-200)', marginBottom: '1.25rem' }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            id={`tab-${i}`}
            style={{
              padding: '0.65rem 1.25rem',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: activeTab === i ? 700 : 500,
              fontSize: '0.875rem',
              color: activeTab === i ? '#1877F2' : 'var(--color-text-muted)',
              borderBottom: activeTab === i ? '2px solid #1877F2' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ──────────── TAB 0: Withdrawal Requests ──────────── */}
      {activeTab === 0 && (
        <div>
          {/* Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {['', 'pending', 'approved', 'paid', 'rejected'].map(s => (
              <button
                key={s || 'all'}
                onClick={() => { setWStatusFilter(s); setWPage(1); }}
                id={`filter-${s || 'all'}`}
                style={{
                  padding: '0.4rem 1rem', borderRadius: 20, border: '1.5px solid',
                  borderColor: wStatusFilter === s ? '#1877F2' : 'var(--color-surface-200)',
                  background: wStatusFilter === s ? 'rgba(24,119,242,0.1)' : 'transparent',
                  color: wStatusFilter === s ? '#1877F2' : 'var(--color-text-muted)',
                  fontWeight: wStatusFilter === s ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                {s === '' ? 'Semua' : statusMap[s]?.label || s}
              </button>
            ))}
          </div>

          <div className="admin-card">
            {wLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size="lg" color="primary" /></div>
            ) : wError ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}><Typography color="error">{wError}</Typography></div>
            ) : withdrawals.length === 0 ? (
              <div className="admin-empty">
                <Banknote size={40} color="var(--color-surface-400)" />
                <Typography variant="h5" className="mt-4">Tidak ada permintaan</Typography>
                <Typography color="muted">Belum ada permintaan penarikan dengan filter yang dipilih.</Typography>
              </div>
            ) : (
              <>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Seller</th>
                        <th>Jumlah</th>
                        <th>Rekening Bank</th>
                        <th>Tanggal</th>
                        <th>Status</th>
                        <th>Bukti</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map(wr => {
                        const s = statusMap[wr.status] || { label: wr.status, variant: 'default', icon: null };
                        return (
                          <tr key={wr.id}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="small" weight="bold">{wr.seller_name}</Typography>
                                <Typography variant="xs" color="muted">{wr.seller_email}</Typography>
                              </div>
                            </td>
                            <td>
                              <Typography variant="small" weight="bold" style={{ color: '#22c55e' }}>{formatIDR(wr.amount)}</Typography>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.825rem', fontWeight: 600 }}>
                                  <Building2 size={12} color="var(--color-text-muted)" /> {wr.bank_name}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                  <CreditCard size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />{wr.account_number}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                  <User size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />{wr.account_holder_name}
                                </span>
                                {wr.bank_verified
                                  ? <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ Terverifikasi</span>
                                  : <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>⚠ Belum Diverifikasi</span>
                                }
                              </div>
                            </td>
                            <td>
                              <Typography variant="xs">{new Date(wr.requested_at).toLocaleDateString('id-ID')}</Typography>
                            </td>
                            <td>
                              <Badge variant={s.variant}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{s.icon}{s.label}</span>
                              </Badge>
                              {wr.status === 'rejected' && wr.admin_note && (
                                <Typography variant="xs" color="muted" style={{ marginTop: 3, maxWidth: 140 }}>
                                  {wr.admin_note}
                                </Typography>
                              )}
                            </td>
                            <td>
                              {wr.transfer_proof ? (
                                <button
                                  type="button"
                                  onClick={() => viewSecureFile(wr.transfer_proof)}
                                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#1877F2', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                >
                                  <ExternalLink size={12} /> Lihat
                                </button>
                              ) : <Typography variant="xs" color="muted">—</Typography>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
                                {wr.status === 'pending' && (
                                  <>
                                    <button onClick={() => handleApprove(wr.id)} style={actionBtn('#16a34a')} id={`btn-approve-${wr.id}`}>
                                      <CheckCircle size={12} /> Setujui
                                    </button>
                                    <button onClick={() => { setRejectModal({ id: wr.id }); setRejectNote(''); }} style={actionBtn('#ef4444')} id={`btn-reject-${wr.id}`}>
                                      <XCircle size={12} /> Tolak
                                    </button>
                                  </>
                                )}
                                {wr.status === 'approved' && (
                                  <button onClick={() => { setPaidModal({ id: wr.id, amount: wr.amount, seller_name: wr.seller_name }); setProofFile(null); setPaidError(''); }} style={actionBtn('#1877F2')} id={`btn-paid-${wr.id}`}>
                                    <Banknote size={12} /> Tandai Dibayar
                                  </button>
                                )}
                                {wr.status === 'approved' && (
                                  <button onClick={() => { setRejectModal({ id: wr.id }); setRejectNote(''); }} style={actionBtn('#ef4444')} id={`btn-reject-approved-${wr.id}`}>
                                    <XCircle size={12} /> Tolak
                                  </button>
                                )}
                                {['paid', 'rejected'].includes(wr.status) && (
                                  <Typography variant="xs" color="muted">—</Typography>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {wTotal > LIMIT && (
                  <div className="admin-pagination">
                    <Button size="sm" variant="outline" disabled={wPage <= 1} onClick={() => setWPage(p => p - 1)}>← Sebelumnya</Button>
                    <Typography variant="small" color="muted">Halaman {wPage} dari {Math.ceil(wTotal / LIMIT)}</Typography>
                    <Button size="sm" variant="outline" disabled={wPage >= Math.ceil(wTotal / LIMIT)} onClick={() => setWPage(p => p + 1)}>Berikutnya →</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ──────────── TAB 1: Bank Accounts ──────────── */}
      {activeTab === 1 && (
        <div>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Cari seller atau bank..."
              value={bSearch}
              onChange={e => { setBSearch(e.target.value); setBPage(1); }}
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
              id="input-search-bank"
            />
          </div>

          <div className="admin-card">
            {bLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size="lg" color="primary" /></div>
            ) : bankAccounts.length === 0 ? (
              <div className="admin-empty">
                <Building2 size={40} color="var(--color-surface-400)" />
                <Typography variant="h5" className="mt-4">Belum ada rekening</Typography>
                <Typography color="muted">Belum ada seller yang menambahkan rekening bank.</Typography>
              </div>
            ) : (
              <>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Seller</th>
                        <th>Bank</th>
                        <th>Nomor Rekening</th>
                        <th>Pemilik</th>
                        <th>Utama</th>
                        <th>Status Verifikasi</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.map(acc => (
                        <tr key={acc.id}>
                          <td>
                            <Typography variant="small" weight="bold">{acc.seller_name}</Typography>
                            <Typography variant="xs" color="muted">{acc.seller_email}</Typography>
                          </td>
                          <td><Typography variant="small">{acc.bank_name}</Typography></td>
                          <td><Typography variant="small">{acc.account_number}</Typography></td>
                          <td><Typography variant="small">{acc.account_holder_name}</Typography></td>
                          <td>{acc.is_primary ? <Badge variant="primary">Utama</Badge> : <Typography variant="xs" color="muted">—</Typography>}</td>
                          <td>
                            {acc.is_verified
                              ? <Badge variant="success"><CheckCircle size={11} style={{ marginRight: 3 }} />Terverifikasi</Badge>
                              : <Badge variant="warning"><Clock size={11} style={{ marginRight: 3 }} />Belum</Badge>
                            }
                            {acc.verified_at && (
                              <Typography variant="xs" color="muted" style={{ marginTop: 3 }}>
                                {new Date(acc.verified_at).toLocaleDateString('id-ID')}
                              </Typography>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => handleVerify(acc.id)}
                              style={actionBtn(acc.is_verified ? '#6b7280' : '#16a34a')}
                              id={`btn-verify-${acc.id}`}
                            >
                              {acc.is_verified ? <><XCircle size={12} /> Batalkan</> : <><CheckCircle size={12} /> Verifikasi</>}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bTotal > LIMIT && (
                  <div className="admin-pagination">
                    <Button size="sm" variant="outline" disabled={bPage <= 1} onClick={() => setBPage(p => p - 1)}>← Sebelumnya</Button>
                    <Typography variant="small" color="muted">Halaman {bPage} dari {Math.ceil(bTotal / LIMIT)}</Typography>
                    <Button size="sm" variant="outline" disabled={bPage >= Math.ceil(bTotal / LIMIT)} onClick={() => setBPage(p => p + 1)}>Berikutnya →</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
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

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)',
  marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em',
};

const actionBtn = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '0.3rem 0.65rem', borderRadius: 6, border: 'none',
  background: `${color}22`, color: color, fontWeight: 700,
  fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'filter 0.15s',
});

export default AdminWithdrawals;
