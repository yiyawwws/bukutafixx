import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, ShoppingBag, User, CheckCircle, Clock,
  BookOpen, ListOrdered
} from 'lucide-react';
import Typography from '../components/atoms/Typography';
import Badge from '../components/atoms/Badge';
import { AuthContext } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import './Dashboard.css';

const StatCard = ({ icon, title, value, color = 'primary' }) => (
  <div className={`stat-card stat-card-${color}`}>
    <div className="stat-card-icon">{icon}</div>
    <div>
      <p className="stat-card-value">{value}</p>
      <p className="stat-card-title">{title}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  // ✅ Urutan penting: isAdmin harus dicek duluan karena
  // admin bisa saja punya active_role = 'seller', tapi tetap harus ditampilkan sebagai Admin
  const isAdmin  = user?.role === 'admin';
  const isSeller = !isAdmin && user?.active_role === 'seller';
  const isBuyer  = !isAdmin && !isSeller;

  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        let res;
        if (isAdmin) {
          res = await dashboardService.getAdminStats();
        } else if (isSeller) {
          res = await dashboardService.getSellerStats();
        } else {
          res = await dashboardService.getBuyerStats();
        }
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };
    if (user) fetchStats();
  }, [user, isAdmin, isSeller]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);


  return (
    <div className="dashboard-page">
      {/* Welcome */}
      <div className="dashboard-welcome">
        <div>
          <Typography variant="h3" weight="bold">
            Selamat Datang, {user?.name?.split(' ')[0]}! 👋
          </Typography>
          <Typography variant="small" color="muted" className="mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </div>
        {/* Badge verifikasi hanya untuk user bukan admin */}
        {!isAdmin && (
          <div className="dashboard-status">
            <Badge variant={user?.is_verified ? 'success' : 'warning'}>
              {user?.is_verified ? (
                <><CheckCircle size={12} /> Terverifikasi</>
              ) : (
                <><Clock size={12} /> Menunggu Verifikasi</>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        {isAdmin ? (
          <>
            <StatCard icon={<User size={22} />} title="Total User" value={stats ? stats.total_users : '—'} color="primary" />
            <StatCard icon={<BookOpen size={22} />} title="Total Buku" value={stats ? stats.total_books : '—'} color="success" />
            <StatCard icon={<ListOrdered size={22} />} title="Pesanan Aktif" value={stats ? stats.total_orders : '—'} color="warning" />
          </>
        ) : isSeller ? (
          <>
            <StatCard icon={<BookOpen size={22} />} title="Buku Dijual" value={stats ? stats.total_books : '—'} color="primary" />
            <StatCard icon={<ListOrdered size={22} />} title="Pesanan Masuk" value={stats ? stats.total_orders : '—'} color="success" />
            <StatCard icon={<BarChart2 size={22} />} title="Total Penjualan" value={stats ? formatCurrency(stats.total_revenue) : '—'} color="warning" />
          </>
        ) : (
          <>
            <StatCard icon={<ShoppingBag size={22} />} title="Pesanan Saya" value={stats ? stats.total_orders : '—'} color="primary" />
            <StatCard icon={<CheckCircle size={22} />} title="Buku di Keranjang" value={stats ? stats.cart_count : '—'} color="success" />
            <StatCard icon={<Clock size={22} />} title="Total Belanja" value={stats ? formatCurrency(stats.total_spent) : '—'} color="warning" />
          </>
        )}
      </div>

      {/* Account info card */}
      <div className="dashboard-info-card">
        <div className="dashboard-info-header">
          <Typography variant="h5" weight="bold">Informasi Akun</Typography>
        </div>
        <div className="dashboard-info-grid">
          <div className="dashboard-info-item">
            <span className="dashboard-info-label">Nama</span>
            <span className="dashboard-info-value">{user?.name}</span>
          </div>
          <div className="dashboard-info-item">
            <span className="dashboard-info-label">Email</span>
            <span className="dashboard-info-value">{user?.email}</span>
          </div>
          <div className="dashboard-info-item">
            <span className="dashboard-info-label">Role</span>
            <span className="dashboard-info-value capitalize">
              {isAdmin ? 'Admin' : isSeller ? 'Penjual' : 'Pembeli'}
            </span>
          </div>
          <div className="dashboard-info-item">
            <span className="dashboard-info-label">Status</span>
            <Badge variant={isAdmin || user?.is_verified ? 'success' : 'warning'}>
              {isAdmin || user?.is_verified ? 'Terverifikasi' : 'Belum Terverifikasi'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="dashboard-quick-actions">
        <Typography variant="h5" weight="bold" className="mb-4">Aksi Cepat</Typography>
        <div className="dashboard-action-grid">
          {isAdmin ? (
            // ── Admin: aksi manajemen sistem
            <>
              <Link to="/admin/users" className="dashboard-action-card">
                <User size={24} className="dashboard-action-icon" />
                <span>Kelola User</span>
              </Link>
              <Link to="/admin/books" className="dashboard-action-card">
                <BookOpen size={24} className="dashboard-action-icon" />
                <span>Kelola Buku</span>
              </Link>
              <Link to="/admin/categories" className="dashboard-action-card">
                <ListOrdered size={24} className="dashboard-action-icon" />
                <span>Kategori</span>
              </Link>
              <Link to="/admin/disputes" className="dashboard-action-card">
                <BarChart2 size={24} className="dashboard-action-icon" />
                <span>Dispute</span>
              </Link>
            </>
          ) : isSeller ? (
            // ── Seller: aksi manajemen toko
            <>
              <Link to="/seller/books/add" className="dashboard-action-card">
                <BookOpen size={24} className="dashboard-action-icon" />
                <span>Tambah Buku</span>
              </Link>
              <Link to="/seller/books" className="dashboard-action-card">
                <ListOrdered size={24} className="dashboard-action-icon" />
                <span>Buku Saya</span>
              </Link>
              <Link to="/seller/orders" className="dashboard-action-card">
                <ShoppingBag size={24} className="dashboard-action-icon" />
                <span>Pesanan Masuk</span>
              </Link>
              <Link to="/profile" className="dashboard-action-card">
                <User size={24} className="dashboard-action-icon" />
                <span>Profil Saya</span>
              </Link>
            </>
          ) : (
            // ── Buyer: aksi belanja
            <>
              <Link to="/" className="dashboard-action-card">
                <BookOpen size={24} className="dashboard-action-icon" />
                <span>Cari Buku</span>
              </Link>
              <Link to="/cart" className="dashboard-action-card">
                <ShoppingBag size={24} className="dashboard-action-icon" />
                <span>Keranjang</span>
              </Link>
              <Link to="/buyer/orders" className="dashboard-action-card">
                <ListOrdered size={24} className="dashboard-action-icon" />
                <span>Pesanan Saya</span>
              </Link>
              <Link to="/profile" className="dashboard-action-card">
                <User size={24} className="dashboard-action-icon" />
                <span>Profil Saya</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
