import React, { useState, useRef } from 'react';
import { Truck, X, AlertCircle, Package, Upload } from 'lucide-react';
import Button from '../atoms/Button';
import { orderService } from '../../services/orderService';
import './ShipmentModal.css';

const ShipmentModal = ({ order, onClose, onSuccess }) => {
  const [form, setForm]     = useState({ courier_name: '', tracking_number: '', shipping_note: '' });
  const [file, setFile]     = useState(null);
  const fileInputRef        = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courier_name.trim()) {
      setError('Nama kurir wajib diisi.');
      return;
    }
    if (!form.tracking_number.trim()) {
      setError('Nomor resi wajib diisi.');
      return;
    }
    if (!file) {
      setError('Bukti pengiriman wajib diunggah.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('courier_name', form.courier_name);
      if (form.tracking_number) formData.append('tracking_number', form.tracking_number);
      if (form.shipping_note) formData.append('shipping_note', form.shipping_note);
      if (file) formData.append('shipping_proof_image', file);

      const res = await orderService.submitShipment(order.id, formData);
      if (res.success) {
        onSuccess(order.id);
      } else {
        setError(res.message || 'Gagal mengirim bukti pengiriman.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const couriers = ['JNE', 'J&T Express', 'SiCepat', 'Anteraja', 'POS Indonesia', 'GoSend', 'GrabExpress', 'Lainnya'];

  return (
    <div className="shipment-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="shipment-modal">
        {/* Header */}
        <div className="shipment-modal-header">
          <div className="shipment-modal-title-row">
            <div className="shipment-modal-icon-wrap">
              <Truck size={20} color="#2563EB" />
            </div>
            <div>
              <p className="shipment-modal-title">Input Bukti Pengiriman</p>
              <p className="shipment-modal-subtitle">Order #{order.id} · {order.buyer_name}</p>
            </div>
          </div>
          <button className="shipment-modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Info strip */}
        <div className="shipment-modal-info">
          <AlertCircle size={15} />
          <span>Pastikan data pengiriman benar. Setelah disubmit, status order akan berubah ke <strong>Dikirim</strong> dan pembeli akan diberitahu.</span>
        </div>

        <form className="shipment-modal-form" onSubmit={handleSubmit}>
          {/* Courier */}
          <div className="shipment-form-group">
            <label className="shipment-label">
              Kurir / Ekspedisi <span>*</span>
            </label>
            <div className="shipment-courier-grid">
              {couriers.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`shipment-courier-chip${form.courier_name === c ? ' selected' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, courier_name: c }))}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              className="shipment-input"
              name="courier_name"
              placeholder="Atau ketik nama kurir..."
              value={form.courier_name}
              onChange={handleChange}
              maxLength={100}
            />
          </div>

          {/* Tracking number */}
          <div className="shipment-form-group">
            <label className="shipment-label">
              Nomor Resi <span>*</span>
            </label>
            <input
              className="shipment-input"
              name="tracking_number"
              placeholder="Contoh: JNE1234567890"
              value={form.tracking_number}
              onChange={handleChange}
              maxLength={100}
            />
          </div>

          {/* Note */}
          <div className="shipment-form-group">
            <label className="shipment-label">
              Catatan Pengiriman <span className="shipment-label-optional">(opsional)</span>
            </label>
            <textarea
              className="shipment-textarea"
              name="shipping_note"
              placeholder="Contoh: Dikirim via dropbox, terbungkus bubble wrap..."
              value={form.shipping_note}
              onChange={handleChange}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Upload Proof */}
          <div className="shipment-form-group">
            <label className="shipment-label">
              Bukti Pengiriman <span>*</span>
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${file ? '#22c55e' : 'var(--color-surface-200)'}`,
                borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer',
                background: file ? 'rgba(34,197,94,0.05)' : 'var(--color-surface-50)',
                transition: 'all 0.2s',
              }}
            >
              <Upload size={20} color={file ? '#22c55e' : 'var(--color-text-muted)'} style={{ marginBottom: 4 }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: file ? '#22c55e' : 'var(--color-text-muted)', fontWeight: file ? 600 : 400 }}>
                {file ? file.name : 'Klik untuk upload bukti pengiriman (JPG, PNG, WebP, PDF)'}
              </p>
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*,application/pdf" 
              style={{ display: 'none' }} 
              onChange={e => setFile(e.target.files[0])} 
            />
          </div>

          {/* Error */}
          {error && (
            <div className="shipment-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="shipment-modal-footer">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading} leftIcon={<Truck size={15} />}>
              Konfirmasi Pengiriman
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipmentModal;
