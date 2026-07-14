import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import Typography from '../../components/atoms/Typography';
import Badge from '../../components/atoms/Badge';
import Spinner from '../../components/atoms/Spinner';
import Button from '../../components/atoms/Button';
import { Package, Truck, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import './AdminPages.css';

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

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrders({ role: 'admin', limit: 100 });
      if (res.success) {
        setOrders(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat riwayat pesanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
      <div className="admin-page-header">
        <div>
          <Typography variant="h3" weight="bold">Riwayat Pesanan</Typography>
          <Typography variant="body" color="muted">Lihat semua riwayat pemesanan terbaru sampai terlama</Typography>
        </div>
      </div>

      <div className="admin-card">
        {orders.length === 0 ? (
          <div className="admin-empty">
            <Package size={48} color="var(--color-surface-400)" />
            <Typography variant="h5" className="mt-4">Belum ada pesanan</Typography>
            <Typography color="muted">Sistem belum mencatat pesanan apa pun.</Typography>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Pembeli</th>
                  <th>Item yang Dipesan</th>
                  <th>Total & Metode</th>
                  <th>Status Pesanan</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <Typography variant="small" weight="bold">ORD-{order.id}</Typography>
                      <Typography variant="xs" color="muted">
                        {new Date(order.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
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
                            {item.title} ({item.quantity}x) - <span style={{ color: 'var(--color-text-muted)' }}>{item.seller_name}</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
