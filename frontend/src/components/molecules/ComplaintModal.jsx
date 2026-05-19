import React, { useState } from 'react';
import { ShieldAlert, X, AlertCircle } from 'lucide-react';
import { orderService } from '../../services/orderService';
import Button from '../atoms/Button';
import './ComplaintModal.css';

const REASONS = [
  'Barang tidak sesuai deskripsi',
  'Barang rusak / cacat',
  'Barang tidak sampai',
  'Penjual tidak responsif',
  'Barang palsu / tidak original',
  'Lainnya',
];

const ComplaintModal = ({ order, onClose, onSuccess }) => {
  const [reason, setReason]       = useState('');
  const [detail, setDetail]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = reason === 'Lainnya' ? detail.trim() : reason;
    if (!finalReason) {
      setError('Pilih atau tulis alasan komplain.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await orderService.createComplaint(order.id, {
        reason: finalReason,
      });
      if (res.success) {
        onSuccess(order.id);
      } else {
        setError(res.message || 'Gagal mengirim komplain.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complaint-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="complaint-modal">
        {/* Header */}
        <div className="complaint-modal-header">
          <div className="complaint-modal-title-row">
            <div className="complaint-modal-icon-wrap">
              <ShieldAlert size={20} color="#D97706" />
            </div>
            <div>
              <p className="complaint-modal-title">Ajukan Komplain</p>
              <p className="complaint-modal-subtitle">Order #{order.id}</p>
            </div>
          </div>
          <button className="complaint-modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Info strip */}
        <div className="complaint-modal-info">
          <AlertCircle size={15} />
          <span>
            Dana akan <strong>dibekukan</strong> sampai admin menyelesaikan komplain ini.
            Admin akan menghubungi Anda dalam 1×24 jam.
          </span>
        </div>

        <form className="complaint-modal-form" onSubmit={handleSubmit}>
          {/* Reason chips */}
          <div className="complaint-form-group">
            <label className="complaint-label">
              Alasan Komplain <span>*</span>
            </label>
            <div className="complaint-reason-grid">
              {REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`complaint-reason-chip${reason === r ? ' selected' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom detail if "Lainnya" or always show for context */}
          <div className="complaint-form-group">
            <label className="complaint-label">
              Deskripsi Tambahan
              {reason !== 'Lainnya' && <span className="complaint-label-optional">(opsional)</span>}
              {reason === 'Lainnya' && <span>*</span>}
            </label>
            <textarea
              className="complaint-textarea"
              placeholder={
                reason === 'Lainnya'
                  ? 'Jelaskan masalah Anda secara detail...'
                  : 'Jelaskan lebih lanjut jika perlu...'
              }
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <span className="complaint-char-count">{detail.length}/1000</span>
          </div>

          {/* Error */}
          {error && (
            <div className="complaint-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="complaint-modal-footer">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="warning"
              size="sm"
              isLoading={loading}
              leftIcon={<ShieldAlert size={15} />}
              disabled={!reason}
            >
              Kirim Komplain
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintModal;
