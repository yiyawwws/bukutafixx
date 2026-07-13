import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import Typography from '../../components/atoms/Typography';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import ShipmentModal from '../../components/molecules/ShipmentModal';
import ConfirmDialog from '../../components/atoms/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Package, Truck, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import '../admin/AdminPages.css';

const statusMap = {
  pending_payment:         { label: 'Menunggu Pembayaran', variant: 'warning', icon: <Clock size={14}/> },
  paid_escrow:             { label: 'Dibayar (Escrow)',    variant: 'info',    icon: <Package size={14}/> },
  waiting_seller_shipment: { label: 'Perlu Dikirim',       variant: 'warning', icon: <Package size={14}/> },
  shipped:                 { label: 'Dikirim',             variant: 'primary', icon: <Truck size={14}/> },
  received:                { label: 'Diterima Pembeli',    variant: 'success', icon: <CheckCircle size={14}/> },
  complaint:               { label: 'Komplain Pembeli',    variant: 'error',   icon: <ShieldAlert size={14}/> },
  completed:               { label: 'Selesai',             variant: 'success', icon: <CheckCircle size={14}/> },
  refunded:                { label: 'Direfund',            variant: 'error',   icon: <XCircle size={14}/> },
  cancelled:               { label: 'Dibatalkan',          variant: 'error',   icon: <XCircle size={14}/> },
  cod_pending:             { label: 'Menunggu Diterima',   variant: 'warning', icon: <Clock size={14}/> },
  cod_accepted:            { label: 'Menunggu COD',        variant: 'info',    icon: <Package size={14}/> },
  cod_completed:           { label: 'COD Selesai',         variant: 'success', icon: <CheckCircle size={14}/> },
  cod_cancelled:           { label: 'COD Dibatalkan',      variant: 'error',   icon: <XCircle size={14}/> },
  cod_failed:              { label: 'COD Gagal',           variant: 'error',   icon: <XCircle size={14}/> },
};

const SellerOrders = () => {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipmentOrder, setShipmentOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [handoverCodeInput, setHandoverCodeInput] = useState({});
  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState(null); // { type, orderId }
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrders({ role: 'seller', limit: 50 });
      if (res.success) {
        setOrders(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleShipmentSuccess = (orderId) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
    setShipmentOrder(null);
    toast.success('Bukti pengiriman berhasil disimpan.');
  };

  const handleAcceptCod = (orderId) => {
    setConfirmDialog({ type: 'acceptCod', orderId });
  };

  const executeAcceptCod = async () => {
    const { orderId } = confirmDialog;
    setConfirmLoading(true);
    try {
      const res = await orderService.acceptCod(orderId);
      if (res.success) {
        toast.success('Order Campus COD diterima!');
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menerima pesanan COD');
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  };

  const handleCompleteCod = async (orderId) => {
    const code = handoverCodeInput[orderId];
    if (!code || code.length !== 6) {
      toast.warning('Masukkan 6 digit kode serah terima');
      return;
    }
    setConfirmDialog({ type: 'completeCod', orderId });
  };

  const executeCompleteCod = async () => {
    const { orderId } = confirmDialog;
    const code = handoverCodeInput[orderId];
    setConfirmLoading(true);
    try {
      const res = await orderService.completeCod(orderId, code);
      if (res.success) {
        toast.success('Transaksi COD Selesai!');
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kode serah terima salah atau gagal');
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  };

  const handleCancelCod = (orderId) => {
    setConfirmDialog({ type: 'cancelCod', orderId });
  };

  const executeCancelCod = async () => {
    const { orderId } = confirmDialog;
    setConfirmLoading(true);
    try {
      const res = await orderService.cancelCod(orderId);
      if (res.success) {
        toast.success('Order Campus COD dibatalkan');
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan pesanan COD');
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchOrders} variant="outline" className="mt-4">Coba Lagi</Button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const s = statusMap[status] || { label: status, variant: 'default', icon: null };
    return (
      <Badge variant={s.variant}>
        {s.icon && <span style={{ marginRight: '4px', display: 'inline-flex', alignItems: 'center' }}>{s.icon}</span>}
        {s.label}
      </Badge>
    );
  };

  return (
    <div className="admin-page">
      {shipmentOrder && (
        <ShipmentModal
          order={shipmentOrder}
          onClose={() => setShipmentOrder(null)}
          onSuccess={handleShipmentSuccess}
        />
      )}

      {/* Confirm: Accept COD */}
      <ConfirmDialog
        open={confirmDialog?.type === 'acceptCod'}
        variant="info"
        title="Terima Order Campus COD?"
        message="Dengan menerima order ini, Anda setuju untuk bertemu dengan pembeli dan menyerahkan buku secara langsung."
        confirmLabel="Ya, Terima"
        cancelLabel="Batal"
        isLoading={confirmLoading}
        onConfirm={executeAcceptCod}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Confirm: Complete COD */}
      <ConfirmDialog
        open={confirmDialog?.type === 'completeCod'}
        variant="success"
        title="Selesaikan Transaksi COD?"
        message="Pastikan Anda telah menerima pembayaran tunai dari pembeli sebelum mengonfirmasi penyelesaian transaksi."
        confirmLabel="Ya, Selesaikan"
        cancelLabel="Batal"
        isLoading={confirmLoading}
        onConfirm={executeCompleteCod}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Confirm: Cancel COD */}
      <ConfirmDialog
        open={confirmDialog?.type === 'cancelCod'}
        variant="danger"
        title="Batalkan Order COD?"
        message="Yakin ingin membatalkan pesanan Campus COD ini? Stok buku akan dikembalikan secara otomatis."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Tidak"
        isLoading={confirmLoading}
        onConfirm={executeCancelCod}
        onCancel={() => setConfirmDialog(null)}
      />
      <div className="admin-page-header">
        <div>
          <Typography variant="h3" weight="bold">Pesanan Masuk</Typography>
          <Typography variant="body" color="muted">Kelola pesanan dari pembeli</Typography>
        </div>
      </div>

      <div className="admin-card">
        {orders.length === 0 ? (
          <div className="admin-empty">
            <Package size={48} color="var(--color-surface-400)" />
            <Typography variant="h5" className="mt-4">Belum ada pesanan</Typography>
            <Typography color="muted">Belum ada pembeli yang memesan buku Anda.</Typography>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Pembeli</th>
                  <th>Item yang Dipesan</th>
                  <th>Total & Pembayaran</th>
                  <th>Status Pengiriman</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  // Karena ini seller dashboard, kita bisa menampilkan semua item yang diorder,
                  // atau hanya item milik seller. Query backend sudah memfilter order yang berisi
                  // minimal 1 item milik seller. Untuk sederhana, kita tampilkan semua item dalam order tersebut.
                  return (
                    <tr key={order.id}>
                      <td>
                        <Typography variant="small" weight="bold">ORD-{order.id}</Typography>
                        <Typography variant="xs" color="muted">
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </Typography>
                      </td>
                      <td>
                        <Typography variant="small" weight="bold">{order.buyer_name}</Typography>
                        <Typography variant="xs" color="muted">{order.buyer_email}</Typography>
                      </td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.875rem' }}>
                          {order.items?.map((item, idx) => (
                            <li key={idx}>
                              {item.title} ({item.quantity}x)
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <Typography variant="small" weight="bold">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.total_amount || 0)}
                        </Typography>
                        <Typography variant="xs" color="muted">
                          {order.fulfillment_method === 'campus_cod' ? 'Tunai di tempat (COD)' : (order.payment_method || '-')}
                        </Typography>
                      </td>
                      <td>
                        {getStatusBadge(order.status)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* Seller Shipping Logic */}
                          {order.status === 'waiting_seller_shipment' && order.fulfillment_method !== 'campus_cod' && (
                            <Button size="sm" variant="primary" onClick={() => setShipmentOrder(order)}>
                              <Truck size={14} style={{ marginRight: '4px' }} /> Kirim Pesanan
                            </Button>
                          )}

                          {/* Campus COD Logic */}
                          {order.status === 'cod_pending' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <Button size="sm" variant="primary" isLoading={actionLoading === order.id} onClick={() => handleAcceptCod(order.id)}>
                                Terima COD
                              </Button>
                              <Button size="sm" variant="outline" isLoading={actionLoading === order.id} onClick={() => handleCancelCod(order.id)}>
                                Tolak
                              </Button>
                            </div>
                          )}

                          {order.status === 'cod_accepted' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <Typography variant="xs" weight="bold" color="primary">Verifikasi Handover</Typography>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input 
                                  type="text" 
                                  placeholder="Kode 6 digit"
                                  maxLength={6}
                                  value={handoverCodeInput[order.id] || ''}
                                  onChange={(e) => setHandoverCodeInput({...handoverCodeInput, [order.id]: e.target.value})}
                                  style={{ padding: '4px 8px', width: '90px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
                                />
                                <Button size="sm" variant="primary" isLoading={actionLoading === order.id} onClick={() => handleCompleteCod(order.id)}>
                                  OK
                                </Button>
                              </div>
                              <Button size="sm" variant="ghost" isLoading={actionLoading === order.id} onClick={() => handleCancelCod(order.id)}>
                                Batalkan
                              </Button>
                            </div>
                          )}

                          {/* Informational Text */}
                          <Typography variant="xs" color="muted" style={{ textAlign: 'center' }}>
                            {order.status === 'pending_payment' && 'Menunggu Pembayaran'}
                            {order.status === 'shipped' && 'Menunggu Konfirmasi Pembeli'}
                            {order.status === 'received' && 'Selesai'}
                            {order.status === 'completed' && 'Selesai'}
                            {order.status === 'complaint' && 'Dalam Komplain'}
                            {order.status === 'cancelled' && 'Batal'}
                            {order.status === 'cod_completed' && 'COD Selesai'}
                            {order.status === 'cod_cancelled' && 'COD Batal'}
                          </Typography>
                        </div>
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
  );
};

export default SellerOrders;
