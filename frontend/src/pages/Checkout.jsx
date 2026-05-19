import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingBag, MapPin, FileText,
  CreditCard, CheckCircle, AlertCircle, ExternalLink,
  BookOpen, ChevronRight, Loader,
} from 'lucide-react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { payService } from '../services/payService';
import Spinner from '../components/atoms/Spinner';
import Button from '../components/atoms/Button';
import './Checkout.css';

const formatPrice = (p) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(p || 0);

/* ── Helper: calculate fee ───────────────────────────────── */
function calcFee(method, subtotal) {
  if (!method) return 0;
  if (method.fee_type === 'percent') {
    const pct = (method.fee / 100) * subtotal;
    return method.min_fee ? Math.max(pct, method.min_fee) : pct;
  }
  return method.fee || 0;
}

/* ── Step indicator ──────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Pengiriman' },
  { id: 2, label: 'Pembayaran' },
  { id: 3, label: 'Selesai' },
];

function StepBar({ current }) {
  return (
    <div className="checkout-steps">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className={`checkout-step ${current === s.id ? 'active' : ''} ${current > s.id ? 'done' : ''}`}>
            <div className="checkout-step-icon">
              {current > s.id ? <CheckCircle size={16} /> : s.id}
            </div>
            <span className="checkout-step-label">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`checkout-step-connector ${current > s.id ? 'active' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
const Checkout = () => {
  const { cart, fetchCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // ── Steps: 1=address, 2=payment-method, 3=done ──────────
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [fulfillmentMethod, setFulfillmentMethod] = useState('seller_shipping'); // 'seller_shipping' or 'campus_cod'
  const [address, setAddress] = useState('');
  const [meetupLocation, setMeetupLocation] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Payment methods
  const [methods, setMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('qris');

  // Loading & errors
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // After order created
  const [orderResult, setOrderResult] = useState(null);   // { order_id, total_amount }
  const [paymentResult, setPaymentResult] = useState(null); // Pakasir response

  /* Redirect if cart is empty */
  useEffect(() => {
    if (cart.length === 0 && step === 1) {
      navigate('/cart', { replace: true });
    }
  }, [cart, step]);

  /* Pre-fill address from user profile */
  useEffect(() => {
    if (user?.address && !address) setAddress(user.address);
  }, [user]);

  /* Load payment methods when entering step 2 */
  useEffect(() => {
    if (step === 2 && methods.length === 0) {
      setLoadingMethods(true);
      payService.getMethods()
        .then((res) => {
          if (res.success) setMethods(res.data);
        })
        .catch(() => {/* ignore, fallback to qris only */})
        .finally(() => setLoadingMethods(false));
    }
  }, [step]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const selectedMethodInfo = methods.find((m) => m.code === selectedMethod) || null;
  const fee = calcFee(selectedMethodInfo, subtotal);
  const totalWithFee = subtotal + fee;

  /* ── Step 1: proceed to payment or submit COD ──────── */
  const handleProceedToPayment = () => {
    setFormError('');
    if (fulfillmentMethod === 'seller_shipping') {
      if (!address.trim()) {
        setFormError('Alamat pengiriman wajib diisi');
        return;
      }
      setStep(2);
    } else {
      if (!meetupLocation.trim()) {
        setFormError('Lokasi pertemuan wajib diisi');
        return;
      }
      if (!meetupTime.trim()) {
        setFormError('Waktu pertemuan wajib diisi');
        return;
      }
      // If COD, skip step 2 and create order directly
      handlePay();
    }
  };

  /* ── Step 2: create order then create Pakasir payment ── */
  const handlePay = async () => {
    setSubmitting(true);
    setError('');
    try {
      // 1. Create order
      const payload = {
        fulfillment_method: fulfillmentMethod,
        cart_item_ids: cart.map((i) => i.id),
      };

      if (fulfillmentMethod === 'seller_shipping') {
        payload.shipping_address = address.trim();
        if (notes.trim()) payload.notes = notes.trim();
      } else {
        payload.meetup_location = meetupLocation.trim();
        payload.meetup_time = meetupTime.trim();
        if (notes.trim()) payload.meetup_note = notes.trim();
      }

      const orderRes = await orderService.createOrder(payload);

      if (!orderRes.success) {
        setError(orderRes.message || 'Gagal membuat pesanan.');
        setSubmitting(false);
        return;
      }

      const orderId = orderRes.order_id;
      setOrderResult({ order_id: orderId, total_amount: orderRes.total_amount });

      if (fulfillmentMethod === 'campus_cod') {
        // Skip Pakasir for COD
        await fetchCart();
        setStep(3);
        setSubmitting(false);
        return;
      }

      // 2. Create Pakasir payment
      const payRes = await payService.createPayment({
        order_id: orderId,
        payment_method: selectedMethod,
        redirect_url: `${window.location.origin}/buyer/orders?payment_redirect=true&ref_id=${orderId}`,
      });

      if (!payRes.success) {
        setError(payRes.message || 'Gagal membuat pembayaran. Silakan coba lagi.');
        setSubmitting(false);
        return;
      }

      setPaymentResult(payRes.data);
      await fetchCart(); // clear cart context
      setStep(3);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Terjadi kesalahan. Silakan coba lagi.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── RENDER: Step 3 – success ────────────────────────── */
  if (step === 3) {
    return (
      <div className="checkout-page container">
        <StepBar current={3} />
        <div className="checkout-success">
          <div className="checkout-success-icon">
            <CheckCircle size={40} strokeWidth={2} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Pesanan Berhasil Dibuat!
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            {fulfillmentMethod === 'campus_cod' 
              ? `Order #${orderResult?.order_id} telah berhasil dibuat. Silakan hubungi penjual untuk membuat janji temu dan bayar tunai di lokasi.` 
              : `Order #${orderResult?.order_id} telah berhasil dibuat. Selesaikan pembayaran untuk memproses pesanan Anda.`}
          </p>

          {fulfillmentMethod === 'campus_cod' && (
            <div className="payment-info-box">
              <h4>Informasi Pertemuan</h4>
              <div className="payment-info-row">
                <span className="label">Metode</span>
                <span className="value">Campus COD (Ketemuan)</span>
              </div>
              <div className="payment-info-row">
                <span className="label">Total Bayar (Tunai)</span>
                <span className="value" style={{ fontSize: '1.125rem', color: 'var(--color-primary-600)', fontWeight: 700 }}>
                  {formatPrice(orderResult.total_amount)}
                </span>
              </div>
              <div className="payment-info-row" style={{ marginTop: '0.5rem' }}>
                <span className="label">Lokasi</span>
                <span className="value">{meetupLocation}</span>
              </div>
              <div className="payment-info-row">
                <span className="label">Waktu</span>
                <span className="value">{meetupTime}</span>
              </div>
              <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: 'var(--color-warning-600)' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                Jangan berikan kode serah terima ke penjual sebelum Anda menerima dan memeriksa buku.
              </p>
            </div>
          )}

          {/* Payment info box */}
          {paymentResult && (
            <div className="payment-info-box">
              <h4>Informasi Pembayaran</h4>
              <div className="payment-info-row">
                <span className="label">Metode</span>
                <span className="value">{paymentResult.payment_method?.toUpperCase()?.replace('_', ' ')}</span>
              </div>
              <div className="payment-info-row">
                <span className="label">Subtotal</span>
                <span className="value">{formatPrice(paymentResult.amount)}</span>
              </div>
              <div className="payment-info-row">
                <span className="label">Biaya layanan</span>
                <span className="value">{formatPrice(paymentResult.fee)}</span>
              </div>
              <div className="payment-info-row" style={{ borderTop: '1px solid var(--color-primary-100)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                <span className="label" style={{ fontWeight: 700 }}>Total Bayar</span>
                <span className="value" style={{ fontSize: '1.125rem', color: 'var(--color-primary-600)' }}>
                  {formatPrice(paymentResult.total_payment)}
                </span>
              </div>
              {paymentResult.payment_number && (
                <div className="payment-info-row" style={{ marginTop: '0.75rem' }}>
                  <span className="label">Nomor VA / Kode</span>
                  <span className="payment-number-badge">{paymentResult.payment_number}</span>
                </div>
              )}
              {paymentResult.expired_at && (
                <div className="payment-info-row">
                  <span className="label">Berlaku hingga</span>
                  <span className="value">{new Date(paymentResult.expired_at).toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          )}

          {/* Pay URL button */}
          {paymentResult?.payment_url && (
            <a
              href={paymentResult.payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pay-url-btn"
            >
              <CreditCard size={18} />
              Bayar Sekarang
              <ExternalLink size={16} />
            </a>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <Button
              variant="outline"
              onClick={() => navigate('/buyer/orders')}
              leftIcon={<ShoppingBag size={16} />}
            >
              Lihat Pesanan Saya
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
            >
              Kembali Belanja
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── RENDER: Step 1 & 2 ──────────────────────────────── */
  return (
    <div className="checkout-page container">
      {/* Back button */}
      <button className="checkout-back-btn" onClick={() => step === 1 ? navigate('/cart') : setStep(1)}>
        <ArrowLeft size={16} />
        {step === 1 ? 'Kembali ke Keranjang' : 'Kembali ke Pengiriman'}
      </button>

      <div className="checkout-header" style={{ marginTop: '0.75rem' }}>
        <ShoppingBag size={26} style={{ color: 'var(--color-primary-500)' }} />
        <h2 style={{ fontWeight: 800, fontSize: '1.375rem' }}>Checkout</h2>
      </div>

      <StepBar current={step} />

      {error && (
        <div className="checkout-error-alert" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="checkout-grid">
        {/* ─── Left column ────────────────────────────── */}
        <div>
          {/* STEP 1: Address */}
          {step === 1 && (
            <>
              <div className="checkout-panel">
                <div className="checkout-panel-title">
                  <ShoppingBag size={18} />
                  Metode Pengiriman
                </div>
                <div className="fulfillment-methods">
                  <label className={`fulfillment-method-card ${fulfillmentMethod === 'seller_shipping' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="fulfillment" 
                      value="seller_shipping"
                      checked={fulfillmentMethod === 'seller_shipping'}
                      onChange={() => { setFulfillmentMethod('seller_shipping'); setFormError(''); }}
                    />
                    <div className="fulfillment-method-info">
                      <span className="fulfillment-title">Kirim via Kurir Reguler</span>
                      <span className="fulfillment-desc">Dikirim oleh penjual ke alamat Anda. Pembayaran melalui aplikasi.</span>
                    </div>
                  </label>
                  <label className={`fulfillment-method-card ${fulfillmentMethod === 'campus_cod' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="fulfillment" 
                      value="campus_cod"
                      checked={fulfillmentMethod === 'campus_cod'}
                      onChange={() => { setFulfillmentMethod('campus_cod'); setFormError(''); }}
                    />
                    <div className="fulfillment-method-info">
                      <span className="fulfillment-title">Campus COD (Ketemuan)</span>
                      <span className="fulfillment-desc">Ketemuan dengan penjual di area kampus. Bayar tunai di lokasi.</span>
                    </div>
                  </label>
                </div>
              </div>

              {fulfillmentMethod === 'seller_shipping' && (
                <div className="checkout-panel">
                  <div className="checkout-panel-title">
                    <MapPin size={18} />
                    Alamat Pengiriman
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-field-label">Alamat lengkap *</label>
                    <textarea
                      className={`checkout-address-textarea${formError && !address.trim() ? ' error' : ''}`}
                      placeholder="Masukkan alamat pengiriman lengkap (jalan, nomor, kota, kode pos)..."
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); if (e.target.value) setFormError(''); }}
                      rows={4}
                    />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-field-label">Catatan (opsional)</label>
                    <input
                      className="checkout-notes-input"
                      placeholder="Contoh: Hubungi saya sebelum dikirim..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {fulfillmentMethod === 'campus_cod' && (
                <div className="checkout-panel">
                  <div className="checkout-panel-title">
                    <MapPin size={18} />
                    Detail Pertemuan
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-field-label">Lokasi Pertemuan *</label>
                    <input
                      className={`checkout-notes-input${formError && !meetupLocation.trim() ? ' error' : ''}`}
                      placeholder="Contoh: Kantin FMIPA, Depan Perpustakaan Pusat..."
                      value={meetupLocation}
                      onChange={(e) => { setMeetupLocation(e.target.value); if (e.target.value) setFormError(''); }}
                    />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-field-label">Waktu Pertemuan *</label>
                    <input
                      className={`checkout-notes-input${formError && !meetupTime.trim() ? ' error' : ''}`}
                      placeholder="Contoh: Besok jam 10 pagi, Hari ini jam 3 sore..."
                      value={meetupTime}
                      onChange={(e) => { setMeetupTime(e.target.value); if (e.target.value) setFormError(''); }}
                    />
                  </div>
                  <div className="checkout-field">
                    <label className="checkout-field-label">Catatan Tambahan (opsional)</label>
                    <input
                      className="checkout-notes-input"
                      placeholder="Contoh: Nanti hubungi WA saya saja kalau sudah sampai..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {formError && <p className="checkout-field-error" style={{ marginBottom: '1rem' }}>{formError}</p>}

              {/* Items preview */}
              <div className="checkout-panel">
                <div className="checkout-panel-title">
                  <BookOpen size={18} />
                  Buku yang Dipesan ({cart.length} item)
                </div>
                <div className="checkout-item-list">
                  {cart.map((item) => (
                    <div key={item.id} className="checkout-item">
                      <div className="checkout-item-img">
                        {item.cover_url
                          ? <img src={item.cover_url} alt={item.title} />
                          : <BookOpen size={24} strokeWidth={1} />
                        }
                      </div>
                      <div className="checkout-item-info">
                        <div className="checkout-item-title">{item.title}</div>
                        <div className="checkout-item-author">{item.author}</div>
                        <div className="checkout-item-qty">Qty: {item.quantity}</div>
                      </div>
                      <div className="checkout-item-price">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={submitting}
                rightIcon={<ChevronRight size={18} />}
                onClick={handleProceedToPayment}
                disabled={submitting}
              >
                {fulfillmentMethod === 'campus_cod' 
                  ? (submitting ? 'Memproses...' : 'Buat Pesanan COD') 
                  : 'Pilih Metode Pembayaran'}
              </Button>
            </>
          )}

          {/* STEP 2: Payment method */}
          {step === 2 && (
            <>
              <div className="checkout-panel">
                <div className="checkout-panel-title">
                  <CreditCard size={18} />
                  Metode Pembayaran (Pakasir)
                </div>

                {loadingMethods ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                    <Spinner />
                  </div>
                ) : methods.length > 0 ? (
                  <div className="payment-methods-grid">
                    {methods.map((m) => (
                      <label
                        key={m.code}
                        className={`payment-method-card${selectedMethod === m.code ? ' selected' : ''}`}
                        onClick={() => setSelectedMethod(m.code)}
                      >
                        <div className="payment-method-radio">
                          <input
                            type="radio"
                            name="payment_method"
                            value={m.code}
                            checked={selectedMethod === m.code}
                            onChange={() => setSelectedMethod(m.code)}
                          />
                          <span className="payment-method-name">{m.label}</span>
                        </div>
                        <div className="payment-method-fee">
                          Biaya:{' '}
                          {m.fee_type === 'percent'
                            ? `${m.fee}%${m.min_fee ? ` (min. ${formatPrice(m.min_fee)})` : ''}`
                            : formatPrice(m.fee)}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  /* Fallback if methods can't be loaded */
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    <p>Menggunakan metode default: <strong>QRIS (0.7%)</strong></p>
                  </div>
                )}
              </div>

              {/* Address summary */}
              <div className="checkout-panel" style={{ padding: '1.25rem 1.75rem' }}>
                <div className="checkout-panel-title" style={{ marginBottom: '0.5rem' }}>
                  <MapPin size={16} />
                  Alamat Pengiriman
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  {address}
                </p>
                {notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    <FileText size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    {notes}
                  </p>
                )}
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={submitting}
                rightIcon={!submitting ? <CreditCard size={18} /> : null}
                onClick={handlePay}
                disabled={submitting}
              >
                {submitting ? 'Memproses...' : 'Buat Pesanan & Bayar'}
              </Button>
            </>
          )}
        </div>

        {/* ─── Right column: summary ───────────────────── */}
        <aside className="checkout-summary">
          <div className="checkout-summary-title">Ringkasan Pesanan</div>

          <div className="checkout-summary-row">
            <span>Subtotal ({cart.length} item)</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {step === 2 && selectedMethodInfo && (
            <div className="checkout-summary-row fee">
              <span>Biaya {selectedMethodInfo.label}</span>
              <span>+{formatPrice(fee)}</span>
            </div>
          )}
          <div className="checkout-summary-row muted">
            <span>Biaya layanan</span>
            <span>Gratis</span>
          </div>

          <hr className="checkout-summary-divider" />

          <div className="checkout-summary-row total">
            <span>Total</span>
            <span>{formatPrice(step === 2 && selectedMethodInfo ? totalWithFee : subtotal)}</span>
          </div>

          {step === 2 && selectedMethodInfo && fee > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              * Biaya layanan {selectedMethodInfo.label} sudah termasuk.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
