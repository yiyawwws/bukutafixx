import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { orderService } from '../../services/orderService';
import { disputeService } from '../../services/disputeService';
import Typography from '../../components/atoms/Typography';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import Input from '../../components/atoms/Input';
import ConfirmDialog from '../../components/atoms/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert, CheckCircle, RefreshCw, Truck, Video, Eye } from 'lucide-react';
import './AdminPages.css';

const AdminDisputes = () => {
  const toast = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Resolve dialog: { id, decision }
  const [resolveDialog, setResolveDialog] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Shipment view dialog
  const [shipmentDialog, setShipmentDialog] = useState(null); // stores shipment data
  const [shipmentLoading, setShipmentLoading] = useState(false);

  // Dispute detail dialog (shows video + reason)
  const [detailDialog, setDetailDialog] = useState(null); // stores dispute data
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await adminService.getDisputes();
      if (res.success) setDisputes(res.data);
    } catch (err) {
      setError('Gagal memuat data dispute');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleMarkReview = async (id) => {
    setActionLoading(id);
    try {
      await adminService.markDisputeReview(id);
      toast.success('Dispute ditandai sebagai sedang ditinjau.');
      fetchDisputes();
    } catch (err) {
      toast.error('Gagal menandai dispute');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveOpen = (id, decision) => {
    setResolveDialog({ id, decision });
    setAdminNotes('');
  };

  const executeResolve = async () => {
    if (!adminNotes.trim()) {
      toast.warning('Catatan admin wajib diisi.');
      return;
    }
    setResolveLoading(true);
    try {
      await adminService.resolveDispute(resolveDialog.id, { decision: resolveDialog.decision, admin_notes: adminNotes });
      toast.success(`Dispute berhasil diselesaikan (${resolveDialog.decision}).`);
      fetchDisputes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyelesaikan dispute');
    } finally {
      setResolveLoading(false);
      setResolveDialog(null);
    }
  };

  const handleViewShipment = async (orderId) => {
    setShipmentLoading(true);
    try {
      const res = await orderService.getShipment(orderId);
      if (res.success && res.data) {
        setShipmentDialog(res.data);
      } else {
        toast.error('Detail pengiriman tidak ditemukan atau belum dikirim.');
      }
    } catch (err) {
      toast.error('Gagal memuat info pengiriman');
    } finally {
      setShipmentLoading(false);
    }
  };

  const handleViewDetail = async (disputeId) => {
    setDetailLoading(true);
    try {
      const res = await disputeService.getDispute(disputeId);
      if (res.success && res.data) {
        setDetailDialog(res.data);
      } else {
        toast.error('Detail dispute tidak ditemukan.');
      }
    } catch (err) {
      toast.error('Gagal memuat detail dispute');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  if (loading) return <Spinner size="lg" className="mt-8" />;
  if (error) return <Typography color="danger">{error}</Typography>;

  return (
    <div className="admin-page-container">

      {/* ── Dispute Detail Dialog (video + reason) ────────── */}
      {detailDialog && (
        <div className="cdialog-overlay" onClick={() => setDetailDialog(null)}>
          <div className="cdialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <h3 className="cdialog-title">📋 Detail Dispute #{detailDialog.id}</h3>
            <div style={{ marginBottom: '1.25rem', textAlign: 'left', fontSize: '0.875rem' }}>

              <div style={{ marginBottom: 10 }}>
                <strong>Alasan:</strong>
                <p style={{ marginTop: 4, whiteSpace: 'pre-wrap', color: 'var(--color-text-main)' }}>{detailDialog.reason}</p>
              </div>

              {/* Evidence photos */}
              {detailDialog.evidence_photos && detailDialog.evidence_photos.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Foto Bukti:</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {detailDialog.evidence_photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Bukti ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-surface-200)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Unboxing Video Evidence ── */}
              <div style={{ marginTop: 12 }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Video size={15} /> Video Unboxing
                </strong>
                {detailDialog.unboxing_video_url ? (
                  <div style={{ borderRadius: 8, overflow: 'hidden', background: '#000', border: '1px solid var(--color-surface-200)' }}>
                    <video
                      src={detailDialog.unboxing_video_url}
                      controls
                      style={{ width: '100%', maxHeight: 280, display: 'block' }}
                      preload="metadata"
                    />
                    <div style={{ padding: '6px 10px', background: 'var(--color-surface-100)' }}>
                      <a
                        href={detailDialog.unboxing_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8125rem', color: 'var(--color-primary-600)', fontWeight: 600 }}
                      >
                        Buka di tab baru ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tidak ada video unboxing yang diunggah.</p>
                )}
              </div>
            </div>
            <div className="cdialog-actions">
              <Button variant="outline" onClick={() => setDetailDialog(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Dialog */}
      {resolveDialog && (
        <div className="cdialog-overlay" onClick={() => !resolveLoading && setResolveDialog(null)}>
          <div className="cdialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 className="cdialog-title">
              {resolveDialog.decision === 'refund' ? '🔴 Setujui Refund ke Pembeli?' : '🟢 Teruskan Dana ke Penjual?'}
            </h3>
            <p className="cdialog-message">
              {resolveDialog.decision === 'refund'
                ? 'Dana akan dikembalikan ke pembeli dan pesanan dinyatakan selesai.'
                : 'Dana akan diteruskan ke penjual dan dispute ditutup.'}
            </p>
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Catatan Admin *
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Tuliskan alasan keputusan Anda..."
                style={{
                  width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-surface-300)', fontFamily: 'inherit',
                  fontSize: '0.875rem', resize: 'vertical'
                }}
              />
            </div>
            <div className="cdialog-actions">
              <Button variant="ghost" onClick={() => setResolveDialog(null)} disabled={resolveLoading}>Batal</Button>
              <Button
                variant={resolveDialog.decision === 'refund' ? 'danger' : 'success'}
                onClick={executeResolve}
                isLoading={resolveLoading}
              >
                {resolveDialog.decision === 'refund' ? 'Ya, Refund' : 'Ya, Release'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Info Dialog */}
      {shipmentDialog && (
        <div className="cdialog-overlay" onClick={() => setShipmentDialog(null)}>
          <div className="cdialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 className="cdialog-title">📦 Info Pengiriman</h3>
            <div style={{ marginBottom: '1.25rem', textAlign: 'left', fontSize: '0.875rem' }}>
              <div style={{ marginBottom: 8 }}><strong>Kurir:</strong> {shipmentDialog.courier_name}</div>
              <div style={{ marginBottom: 8 }}><strong>Resi:</strong> {shipmentDialog.tracking_number || '-'}</div>
              <div style={{ marginBottom: 8 }}><strong>Catatan:</strong> {shipmentDialog.shipping_note || '-'}</div>
              {shipmentDialog.shipping_proof_image ? (
                <div style={{ marginTop: 16 }}>
                  <strong>Bukti Pengiriman:</strong>
                  <a href={shipmentDialog.shipping_proof_image} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 8 }}>
                    <img src={shipmentDialog.shipping_proof_image} alt="Bukti Resi" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--color-surface-200)' }} />
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Belum ada foto bukti pengiriman</div>
              )}
            </div>
            <div className="cdialog-actions">
              <Button variant="outline" onClick={() => setShipmentDialog(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-header">
        <div>
          <Typography variant="h4" weight="bold">Dispute & Komplain</Typography>
          <Typography variant="small" color="muted">Tengahi masalah antara pembeli dan penjual.</Typography>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID Order</th>
                <th>Masalah</th>
                <th>Pihak Terkait</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(dis => (
                <tr key={dis.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>#{dis.order_id}</span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(dis.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{dis.reason}</span>
                    <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {dis.description}
                    </p>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    <div><span style={{ color: 'var(--color-text-muted)' }}>Pembeli:</span> {dis.buyer_name}</div>
                    <div><span style={{ color: 'var(--color-text-muted)' }}>Penjual:</span> {dis.seller_name}</div>
                  </td>
                  <td>
                    <Badge variant={
                      dis.status === 'open' ? 'danger' :
                      dis.status === 'under_review' ? 'warning' : 'success'
                    }>
                      {dis.status === 'open' ? 'Baru' :
                       dis.status === 'under_review' ? 'Direview' : 'Selesai'}
                    </Badge>
                  </td>
                  <td>
                    <div className="admin-action-buttons">
                      <Button variant="outline" size="sm" isLoading={detailLoading} onClick={() => handleViewDetail(dis.id)} title="Lihat detail & video unboxing">
                        <Eye size={14} /> Detail
                      </Button>
                      {dis.status === 'open' && (
                        <Button variant="warning" size="sm" isLoading={actionLoading === dis.id} onClick={() => handleMarkReview(dis.id)}>
                          <ShieldAlert size={14} /> Tinjau
                        </Button>
                      )}
                      {dis.status === 'under_review' && (
                        <>
                          <Button variant="danger" size="sm" onClick={() => handleResolveOpen(dis.id, 'refund')} title="Kembalikan dana ke pembeli">
                            <RefreshCw size={14} /> Refund
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleResolveOpen(dis.id, 'release')} title="Teruskan dana ke penjual">
                            <CheckCircle size={14} /> Release
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" isLoading={shipmentLoading} onClick={() => handleViewShipment(dis.order_id)} title="Lihat Info Pengiriman">
                        <Truck size={14} /> Pengiriman
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {disputes.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada komplain aktif.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDisputes;
