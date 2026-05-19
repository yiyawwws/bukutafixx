import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { payService } from '../services/payService';
import Typography from '../components/atoms/Typography';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import DisputeModal from '../components/molecules/DisputeModal';
import ConfirmDialog from '../components/atoms/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  ShoppingBag, Package, Clock, CheckCircle, Truck,
  XCircle, ChevronDown, ChevronUp, RefreshCw, ShieldAlert, Star
} from 'lucide-react';
import { reviewService } from '../services/reviewService';
import ReviewModal from '../components/molecules/ReviewModal';
import './BuyerOrders.css';

const statusMap = {
  pending_payment:         { label: 'Menunggu Pembayaran', variant: 'warning', icon: <Clock size={14}/> },
  paid_escrow:             { label: 'Dibayar (Escrow)',    variant: 'info',    icon: <Package size={14}/> },
  waiting_seller_shipment: { label: 'Menunggu Pengiriman', variant: 'info',    icon: <Package size={14}/> },
  shipped:                 { label: 'Dikirim',             variant: 'primary', icon: <Truck size={14}/> },
  received:                { label: 'Diterima',            variant: 'success', icon: <CheckCircle size={14}/> },
  complaint:               { label: 'Komplain',            variant: 'warning', icon: <ShieldAlert size={14}/> },
  completed:               { label: 'Selesai',             variant: 'success', icon: <CheckCircle size={14}/> },
  refunded:                { label: 'Direfund',            variant: 'error',   icon: <XCircle size={14}/> },
  cancelled:               { label: 'Dibatalkan',          variant: 'error',   icon: <XCircle size={14}/> },
  cod_pending:             { label: 'Menunggu Diterima',   variant: 'warning', icon: <Clock size={14}/> },
  cod_accepted:            { label: 'Menunggu COD',        variant: 'info',    icon: <Package size={14}/> },
  cod_completed:           { label: 'COD Selesai',         variant: 'success', icon: <CheckCircle size={14}/> },
  cod_cancelled:           { label: 'COD Dibatalkan',      variant: 'error',   icon: <XCircle size={14}/> },
  cod_failed:              { label: 'COD Gagal',           variant: 'error',   icon: <XCircle size={14}/> },
};

const BuyerOrders = () => {
  const toast = useToast();
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState({});
  const [cancelling, setCancelling] = useState(null);
  const [disputeOrder, setDisputeOrder] = useState(null);
  const [disputedIds, setDisputedIds]   = useState(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState(null);
  const [shipments, setShipments]       = useState({});
  const [reviewOrder, setReviewOrder]   = useState(null);
  const [reviews, setReviews]           = useState({});

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState(null); // { type, orderId, isCod? }
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.getOrders({ limit: 50 });
      if (res.success) {
        setOrders(res.data);

        // Background sync for pending orders to cover missing webhooks/redirects
        const pendingOrders = res.data.filter(o => o.status === 'pending_payment' && o.pakasir_order_id);
        if (pendingOrders.length > 0) {
          Promise.allSettled(pendingOrders.map(o => payService.checkStatus(o.id)))
            .then(() => {
              // Re-fetch quietly to update the UI if any status changed
              orderService.getOrders({ limit: 50 }).then(r => {
                if (r.success) setOrders(r.data);
              });
            });
        }
      } else {
        setError(res.message || 'Gagal memuat pesanan');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    const paymentRedirect = searchParams.get('payment_redirect');
    const redirectOrderId = searchParams.get('ref_id');

    if (paymentRedirect === 'true' && redirectOrderId) {
      setPaymentSuccessOrder(redirectOrderId);
      // Clean up the URL to prevent showing on refresh
      setSearchParams(new URLSearchParams());
      
      // Force sync the status with Pakasir just in case the webhook was delayed
      payService.checkStatus(redirectOrderId).then(() => {
        fetchOrders();
      }).catch(console.error);
    }
  }, [searchParams, setSearchParams]);

  const toggleExpand = async (order) => {
    const id = order.id;
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    
    // Fetch shipment if needed
    if (!expanded[id] && order.fulfillment_method === 'seller_shipping' && !shipments[id]) {
      try {
        const res = await orderService.getShipment(id);
        if (res.success && res.data) {
          setShipments(prev => ({ ...prev, [id]: res.data }));
        }
      } catch (err) {
        console.error('Failed to fetch shipment', err);
      }
    }

    // Fetch review if completed and not fetched
    if (!expanded[id] && (order.status === 'completed' || order.status === 'cod_completed') && reviews[id] === undefined) {
      try {
        const res = await reviewService.getOrderReview(id);
        if (res.success) {
          setReviews(prev => ({ ...prev, [id]: res.data })); // can be null if not reviewed
        }
      } catch (err) {
        console.error('Failed to fetch review', err);
      }
    }
  };

  const handleCancel = async (id, isCod = false) => {
    setConfirmDialog({ type: 'cancel', orderId: id, isCod });
  };

  const executeCancelOrder = async () => {
    const { orderId, isCod } = confirmDialog;
    setConfirmLoading(true);
    try {
      const res = isCod
        ? await orderService.cancelCod(orderId)
        : await orderService.cancelOrder(orderId);
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId
          ? { ...o, status: isCod ? 'cod_cancelled' : 'cancelled' } : o));
        toast.success(isCod ? 'Order Campus COD berhasil dibatalkan.' : 'Pesanan berhasil dibatalkan.');
      } else {
        toast.error(res.message || 'Gagal membatalkan pesanan');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan pesanan');
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  };

  const handleDisputeSuccess = (orderId) => {
    setDisputedIds(prev => new Set([...prev, orderId]));
    setDisputeOrder(null);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'complaint' } : o));
    toast.success('Komplain berhasil dikirim. Admin akan meninjau dalam 1×24 jam.');
  };

  const handleConfirmReceived = async (orderId) => {
    setConfirmDialog({ type: 'received', orderId });
  };

  const executeConfirmReceived = async () => {
    const { orderId } = confirmDialog;
    setConfirmLoading(true);
    try {
      const res = await orderService.confirmReceived(orderId);
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
        toast.success('Terima kasih! Pesanan telah selesai dan dana diteruskan ke penjual.');
      } else {
        toast.error(res.message || 'Gagal mengkonfirmasi pesanan.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan.');
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  };

  const fmt = (val) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(val || 0);

  if (loading) return (
    <div className="buyer-orders-loading">
      <Spinner size="lg" color="primary" />
      <p>Memuat pesanan...</p>
    </div>
  );

  if (error) return (
    <div className="buyer-orders-error">
      <XCircle size={48} color="#EF4444" />
      <Typography variant="h5" className="mt-4">{error}</Typography>
      <Button onClick={fetchOrders} variant="outline" className="mt-4" leftIcon={<RefreshCw size={16}/>}>
        Coba Lagi
      </Button>
    </div>
  );

  return (
    <div className="buyer-orders-page">
      {/* Dispute Modal */}
      {disputeOrder && (
        <DisputeModal
          order={disputeOrder}
          onClose={() => setDisputeOrder(null)}
          onSuccess={handleDisputeSuccess}
        />
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSuccess={(orderId, reviewData) => {
            setReviews(prev => ({ ...prev, [orderId]: reviewData }));
            setReviewOrder(null);
            toast.success('Ulasan berhasil dikirim!');
          }}
        />
      )}

      {/* Confirm: Cancel Order */}
      <ConfirmDialog
        open={confirmDialog?.type === 'cancel'}
        variant={confirmDialog?.isCod ? 'warning' : 'danger'}
        title={confirmDialog?.isCod ? 'Batalkan Order COD?' : 'Batalkan Pesanan?'}
        message={confirmDialog?.isCod
          ? 'Yakin ingin membatalkan order Campus COD ini? Stok buku akan dikembalikan.'
          : 'Yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.'}
        confirmLabel="Ya, Batalkan"
        cancelLabel="Tidak"
        isLoading={confirmLoading}
        onConfirm={executeCancelOrder}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Confirm: Pesanan Diterima */}
      <ConfirmDialog
        open={confirmDialog?.type === 'received'}
        variant="success"
        title="Konfirmasi Pesanan Diterima"
        message="Pastikan Anda telah menerima pesanan dengan baik sebelum mengonfirmasi. Setelah dikonfirmasi, dana akan diteruskan ke penjual."
        confirmLabel="Ya, Pesanan Diterima"
        cancelLabel="Batal"
        isLoading={confirmLoading}
        onConfirm={executeConfirmReceived}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Header */}
      {paymentSuccessOrder && (
        <div className="buyer-orders-success-banner">
          <CheckCircle size={24} />
          <div className="banner-text">
            <strong>Pembayaran Sedang Diproses!</strong>
            <p>Terima kasih. Kami sedang memverifikasi pembayaran Anda untuk Order #{paymentSuccessOrder}.</p>
          </div>
          <button className="close-banner-btn" onClick={() => setPaymentSuccessOrder(null)}>
            <XCircle size={18} />
          </button>
        </div>
      )}

      <div className="buyer-orders-header">
        <div>
          <Typography variant="h3" weight="bold">Pesanan Saya</Typography>
          <Typography variant="body" color="muted">
            Total {orders.length} pesanan
          </Typography>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm" leftIcon={<RefreshCw size={15}/>}>
          Refresh
        </Button>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="buyer-orders-empty">
          <ShoppingBag size={64} color="var(--color-surface-300)" />
          <Typography variant="h5" className="mt-4">Belum ada pesanan</Typography>
          <Typography color="muted" className="mt-1">
            Yuk belanja buku pertamamu!
          </Typography>
          <a href="/" className="buyer-orders-shop-btn">
            Mulai Belanja
          </a>
        </div>
      ) : (
        <div className="buyer-orders-list">
          {orders.map(order => {
            const statusInfo = statusMap[order.status] || { label: order.status, variant: 'default', icon: <Package size={14}/> };
            const open = expanded[order.id];
            
            const canCancel          = order.status === 'pending_payment';
            const canCancelCod       = order.status === 'cod_pending' || order.status === 'cod_accepted';
            const canConfirmReceived = order.status === 'shipped';
            const canDispute         = order.status === 'shipped' && !disputedIds.has(order.id);
            const hasDisputed        = order.status === 'complaint' || disputedIds.has(order.id);
            const isCod              = order.fulfillment_method === 'campus_cod';

            return (
              <div className="buyer-order-card" key={order.id}>
                {/* Card Header */}
                <div className="buyer-order-card-header">
                  <div className="buyer-order-meta">
                    <span className="buyer-order-id">#{order.id}</span>
                    <span className="buyer-order-date">
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="buyer-order-badges">
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                    {hasDisputed && (
                      <Badge variant="warning">
                        <ShieldAlert size={12} /> Dalam Komplain
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Items preview */}
                <div className="buyer-order-items-preview">
                  {order.items?.slice(0, 2).map((item, idx) => (
                    <div className="buyer-order-item-row" key={idx}>
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} className="buyer-order-item-img" />
                      ) : (
                        <div className="buyer-order-item-img-placeholder">
                          <Package size={20} color="var(--color-surface-400)" />
                        </div>
                      )}
                      <div className="buyer-order-item-info">
                        <p className="buyer-order-item-title">{item.title}</p>
                        <p className="buyer-order-item-sub">{item.author} · {item.quantity}x · {fmt(item.price_at_purchase)}</p>
                      </div>
                    </div>
                  ))}
                  {(order.items?.length || 0) > 2 && !open && (
                    <p className="buyer-order-more">+{order.items.length - 2} item lainnya</p>
                  )}
                  {open && order.items?.slice(2).map((item, idx) => (
                    <div className="buyer-order-item-row" key={`extra-${idx}`}>
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} className="buyer-order-item-img" />
                      ) : (
                        <div className="buyer-order-item-img-placeholder">
                          <Package size={20} color="var(--color-surface-400)" />
                        </div>
                      )}
                      <div className="buyer-order-item-info">
                        <p className="buyer-order-item-title">{item.title}</p>
                        <p className="buyer-order-item-sub">{item.author} · {item.quantity}x · {fmt(item.price_at_purchase)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detail expand */}
                {open && (
                  <div className="buyer-order-detail">
                    {isCod ? (
                      <>
                        <div className="buyer-order-detail-row">
                          <span>Lokasi Pertemuan</span>
                          <span>{order.meetup_location || '-'}</span>
                        </div>
                        <div className="buyer-order-detail-row">
                          <span>Waktu Pertemuan</span>
                          <span>{order.meetup_time || '-'}</span>
                        </div>
                        {order.status === 'cod_accepted' && order.handover_code && (
                          <div className="buyer-order-detail-row" style={{ background: 'var(--color-primary-50)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--color-primary-300)' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary-700)' }}>Kode Serah Terima (Berikan ke penjual)</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--color-primary-600)' }}>
                              {order.handover_code}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="buyer-order-detail-row">
                          <span>Alamat Pengiriman</span>
                          <span>{order.shipping_address || '-'}</span>
                        </div>
                        {shipments[order.id] && (
                          <div className="buyer-order-detail-row" style={{ alignItems: 'flex-start' }}>
                            <span>Informasi Pengiriman</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                              <strong>{shipments[order.id].courier_name}</strong>
                              {shipments[order.id].tracking_number ? (
                                <span>Resi: {shipments[order.id].tracking_number}</span>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)' }}>Belum ada resi</span>
                              )}
                              {shipments[order.id].shipping_note && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                  Catatan: {shipments[order.id].shipping_note}
                                </span>
                              )}
                              {shipments[order.id].shipping_proof_image ? (
                                <a 
                                  href={shipments[order.id].shipping_proof_image} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary-600)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                                >
                                  <Truck size={14} /> Lihat Bukti Pengiriman
                                </a>
                              ) : (
                                <span style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Belum ada foto bukti pengiriman</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {order.notes && (
                      <div className="buyer-order-detail-row">
                        <span>Catatan</span>
                        <span>{order.notes}</span>
                      </div>
                    )}
                    {/* Seller WhatsApp per item */}
                    {order.items?.some(i => i.seller_whatsapp) && (
                      <div className="buyer-order-detail-row" style={{ alignItems: 'flex-start' }}>
                        <span>Hubungi Penjual</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {order.items.filter(i => i.seller_whatsapp).map((item, idx) => (
                            <a
                              key={idx}
                              href={item.seller_whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="buyer-order-wa-btn"
                            >
                              💬 WhatsApp {item.seller_name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dispute info banner if already disputed */}
                    {hasDisputed && (
                      <div className="buyer-order-dispute-banner">
                        <ShieldAlert size={16} />
                        <span>Komplain sedang ditinjau oleh admin. Kami akan menghubungi Anda jika ada perkembangan.</span>
                      </div>
                    )}

                    {/* Review Section */}
                    {(order.status === 'completed' || order.status === 'cod_completed') && (
                      <div className="buyer-order-detail-row" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <span>Ulasan</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                          {reviews[order.id] === undefined ? (
                            <span style={{ color: 'var(--color-text-muted)' }}>Memuat ulasan...</span>
                          ) : reviews[order.id] === null ? (
                            <Button size="sm" variant="outline" onClick={() => setReviewOrder(order)}>
                              Beri Rating
                            </Button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <div style={{ display: 'flex', color: '#FBBF24' }}>
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={14} fill={i < reviews[order.id].rating ? 'currentColor' : 'none'} color={i < reviews[order.id].rating ? '#FBBF24' : 'var(--color-surface-400)'} />
                                ))}
                              </div>
                              {reviews[order.id].comment && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '250px', fontStyle: 'italic' }}>
                                  "{reviews[order.id].comment}"
                                </span>
                              )}
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sudah Dinilai</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Footer */}
                <div className="buyer-order-card-footer">
                  <div className="buyer-order-total">
                    <span>Total</span>
                    <strong>{fmt(order.total_amount)}</strong>
                  </div>
                  <div className="buyer-order-actions">
                    <button
                      className="buyer-order-toggle-btn"
                      onClick={() => toggleExpand(order)}
                    >
                      {open ? <><ChevronUp size={15}/> Sembunyikan</> : <><ChevronDown size={15}/> Lihat Detail</>}
                    </button>
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={cancelling === order.id}
                        onClick={() => handleCancel(order.id, false)}
                      >
                        Batalkan
                      </Button>
                    )}
                    {canCancelCod && (
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={cancelling === order.id}
                        onClick={() => handleCancel(order.id, true)}
                      >
                        Batalkan COD
                      </Button>
                    )}
                    {canConfirmReceived && (
                      <Button
                        size="sm"
                        variant="success"
                        leftIcon={<CheckCircle size={14} />}
                        onClick={() => handleConfirmReceived(order.id)}
                      >
                        Pesanan Diterima
                      </Button>
                    )}
                    {canDispute && (
                      <Button
                        size="sm"
                        variant="warning"
                        leftIcon={<ShieldAlert size={14} />}
                        onClick={() => setDisputeOrder(order)}
                      >
                        Komplain
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;
