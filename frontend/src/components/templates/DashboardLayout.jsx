import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen, User, ShoppingBag, ListOrdered,
  ShieldAlert, Tag, LogOut, Home, PlusCircle,
  BarChart2, RefreshCw, Menu, X, Wallet, CreditCard, ArrowDownCircle, Banknote, Star
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout, switchRole } = useContext(AuthContext);
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getLinks = () => {
    if (!user) return [];

    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', icon: <BarChart2 size={19} />, label: 'Dashboard' },
        { path: '/admin/users', icon: <User size={19} />, label: 'Manajemen User' },
        { path: '/admin/books', icon: <BookOpen size={19} />, label: 'Manajemen Buku' },
        { path: '/admin/categories', icon: <Tag size={19} />, label: 'Kategori' },
        { path: '/admin/disputes', icon: <ShieldAlert size={19} />, label: 'Dispute' },
        { path: '/admin/withdrawals', icon: <Banknote size={19} />, label: 'Penarikan Dana' },
      ];
    }

    if (user.active_role === 'seller') {
      return [
        { path: '/seller/dashboard', icon: <BarChart2 size={19} />, label: 'Dashboard' },
        { path: '/seller/books', icon: <BookOpen size={19} />, label: 'Buku Saya' },
        { path: '/seller/books/add', icon: <PlusCircle size={19} />, label: 'Tambah Buku' },
        { path: '/seller/orders', icon: <ListOrdered size={19} />, label: 'Pesanan Masuk' },
        { path: '/seller/balance', icon: <Wallet size={19} />, label: 'Saldo & Penarikan' },
        { path: '/seller/bank-account', icon: <CreditCard size={19} />, label: 'Rekening Bank' },
        { path: '/seller/withdrawal', icon: <ArrowDownCircle size={19} />, label: 'Tarik Dana' },
        { path: '/seller/reviews', icon: <Star size={19} />, label: 'Ulasan Pembeli' },
        { path: '/profile', icon: <User size={19} />, label: 'Profil Saya' },
      ];
    }

    return [
      { path: '/buyer/dashboard', icon: <BarChart2 size={19} />, label: 'Dashboard' },
      { path: '/buyer/orders', icon: <ShoppingBag size={19} />, label: 'Pesanan Saya' },
      { path: '/profile', icon: <User size={19} />, label: 'Profil Saya' },
    ];
  };

  const links = getLinks();

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <Link to="/" className="dashboard-brand">
        <div className="dashboard-brand-icon">
          <BookOpen size={20} color="#fff" />
        </div>
        <span className="dashboard-brand-text">Bukuta</span>
      </Link>

      {/* User info */}
      {user && (
        <div className="dashboard-user-card">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1877F2&color=fff&bold=true`}
            alt="Avatar"
            className="dashboard-user-avatar"
          />
          <div className="dashboard-user-info">
            <p className="dashboard-user-name">{user.name}</p>
            <p className="dashboard-user-role">
              {user.role === 'admin' ? '⚙️ Admin' : user.active_role === 'seller' ? '🏪 Penjual' : '🎓 Pembeli'}
            </p>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="dashboard-nav">
        <p className="dashboard-nav-section">MENU UTAMA</p>
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`dashboard-nav-item ${location.pathname === link.path ? 'active' : ''}`}
          >
            <span className="dashboard-nav-icon">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
        
        <p className="dashboard-nav-section" style={{ marginTop: '1.5rem' }}>QUICK LINKS</p>
        <Link to="/" className="dashboard-nav-item">
          <span className="dashboard-nav-icon"><Home size={19} /></span>
          <span>Halaman Utama</span>
        </Link>
        {(!user || user.active_role !== 'seller') && (
          <Link to="/cart" className="dashboard-nav-item">
            <span className="dashboard-nav-icon"><ShoppingBag size={19} /></span>
            <span>Keranjang Belanja</span>
          </Link>
        )}
      </nav>

      {/* Bottom Actions */}
      <div style={{ marginTop: 'auto', padding: '0 1rem 1.25rem' }}>
        {user && user.role === 'seller' && (
          <button
            onClick={async () => {
              const newRole = user.active_role === 'seller' ? 'buyer' : 'seller';
              try {
                await switchRole(newRole);
                navigate(`/${newRole}/dashboard`);
              } catch (err) {
                toast.error('Gagal beralih akun');
              }
            }}
            className="dashboard-switch-role-btn"
          >
            <RefreshCw size={16} />
            <span>
              {user.active_role === 'seller'
                ? '🎓 Beralih ke Pembeli'
                : '🏪 Beralih ke Penjual'}
            </span>
          </button>
        )}

        <button onClick={handleLogout} className="dashboard-logout">
          <LogOut size={18} />
          <span>Keluar</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="dashboard-layout">
      {/* ── Mobile Top Bar ─────────────────────────────────── */}
      <div className="dashboard-mobile-bar">
        <button
          className="dashboard-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Buka Menu"
        >
          <Menu size={22} color="#fff" />
        </button>
        <Link to="/" className="dashboard-brand dashboard-mobile-brand">
          <div className="dashboard-brand-icon">
            <BookOpen size={18} color="#fff" />
          </div>
          <span className="dashboard-brand-text">Bukuta</span>
        </Link>
        {/* Spacer to centre the brand */}
        <div style={{ width: 40 }} />
      </div>

      {/* ── Backdrop ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="dashboard-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Desktop Sidebar / Mobile Drawer ────────────────── */}
      <aside className={`dashboard-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="dashboard-drawer-close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup Menu"
        >
          <X size={20} color="rgba(255,255,255,0.8)" />
        </button>

        <SidebarContent />
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
