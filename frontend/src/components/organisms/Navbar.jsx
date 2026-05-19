import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, ShoppingCart, User as UserIcon,
  LogOut, LayoutDashboard, Menu, X, RefreshCw, Home
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import SearchBar from '../molecules/SearchBar';
import Button from '../atoms/Button';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, switchRole } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  const handleSearch = (query) => {
    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/');
    }
    setMobileOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.active_role === 'seller') return '/seller/dashboard';
    return '/buyer/dashboard';
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="navbar-header">
      <nav className="navbar">
        <div className="navbar-inner container">
          {/* Brand */}
          <Link to="/" className="navbar-brand" onClick={closeMobile}>
            <div className="navbar-brand-icon">
              <BookOpen size={22} color="#fff" />
            </div>
            <span className="navbar-brand-text">Bukuta</span>
          </Link>

          {/* Search Bar (center, desktop) */}
          <div className="navbar-search">
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Desktop Actions */}
          <div className="navbar-actions">
            {user ? (
              <>
                <Link to="/cart" className="navbar-icon-btn" aria-label="Keranjang">
                  <ShoppingCart size={20} color="rgba(255,255,255,0.9)" />
                  {cart.length > 0 && (
                    <span className="navbar-badge">{cart.length > 9 ? '9+' : cart.length}</span>
                  )}
                </Link>

                <Link to={getDashboardLink()} className="navbar-icon-btn" aria-label="Dashboard">
                  <LayoutDashboard size={20} color="rgba(255,255,255,0.9)" />
                </Link>

                <div className="navbar-dropdown">
                  <button className="navbar-user-btn" aria-label="Menu Pengguna">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1877F2&color=fff&bold=true`}
                      alt="Avatar"
                      className="navbar-avatar"
                    />
                  </button>
                  <div className="navbar-dropdown-menu">
                    <div className="navbar-dropdown-header">
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1877F2&color=fff&bold=true`}
                        alt="Avatar"
                        className="navbar-dropdown-avatar"
                      />
                      <div>
                        <p className="navbar-dropdown-name">{user.name}</p>
                        <p className="navbar-dropdown-email">{user.email}</p>
                      </div>
                    </div>
                    <hr className="navbar-dropdown-divider" />
                    <Link to="/profile" className="navbar-dropdown-item">
                      <UserIcon size={16} />
                      <span>Profil Saya</span>
                    </Link>
                    <Link to={getDashboardLink()} className="navbar-dropdown-item">
                      <LayoutDashboard size={16} />
                      <span>Dashboard</span>
                    </Link>
                    
                    {user.role === 'seller' && (
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
                        className="navbar-dropdown-item"
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <RefreshCw size={16} />
                        <span>{user.active_role === 'seller' ? 'Beralih ke Pembeli' : 'Beralih ke Penjual'}</span>
                      </button>
                    )}
                    <hr className="navbar-dropdown-divider" />
                    <button onClick={handleLogout} className="navbar-dropdown-item danger">
                      <LogOut size={16} />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="navbar-auth">
                <Link to="/login">
                  <Button variant="light" size="sm">Masuk</Button>
                </Link>
                <Link to="/register">
                  <Button variant="secondary" size="sm">Daftar</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="navbar-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X size={22} color="#fff" /> : <Menu size={22} color="#fff" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Dropdown Panel ────────────────────────── */}
        {mobileOpen && (
          <div className="navbar-mobile-panel">
            {/* Search */}
            <div className="navbar-mobile-search-wrap">
              <SearchBar onSearch={handleSearch} />
            </div>

            {user ? (
              <>
                {/* User info strip */}
                <div className="navbar-mobile-user">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1877F2&color=fff&bold=true`}
                    alt="Avatar"
                    className="navbar-mobile-avatar"
                  />
                  <div>
                    <p className="navbar-mobile-name">{user.name}</p>
                    <p className="navbar-mobile-email">{user.email}</p>
                  </div>
                </div>

                <div className="navbar-mobile-divider" />

                {/* Nav links */}
                <Link to="/" className="navbar-mobile-link" onClick={closeMobile}>
                  <Home size={17} /> <span>Beranda</span>
                </Link>
                <Link to="/cart" className="navbar-mobile-link" onClick={closeMobile}>
                  <ShoppingCart size={17} />
                  <span>Keranjang</span>
                  {cart.length > 0 && <span className="navbar-mobile-badge">{cart.length}</span>}
                </Link>
                <Link to={getDashboardLink()} className="navbar-mobile-link" onClick={closeMobile}>
                  <LayoutDashboard size={17} /> <span>Dashboard</span>
                </Link>
                <Link to="/profile" className="navbar-mobile-link" onClick={closeMobile}>
                  <UserIcon size={17} /> <span>Profil Saya</span>
                </Link>

                {user.role === 'seller' && (
                  <button
                    className="navbar-mobile-link navbar-mobile-switch"
                    onClick={async () => {
                      const newRole = user.active_role === 'seller' ? 'buyer' : 'seller';
                      try {
                        await switchRole(newRole);
                        navigate(`/${newRole}/dashboard`);
                      } catch (err) {
                        toast.error('Gagal beralih akun');
                      }
                      closeMobile();
                    }}
                  >
                    <RefreshCw size={17} />
                    <span>{user.active_role === 'seller' ? 'Beralih ke Pembeli' : 'Beralih ke Penjual'}</span>
                  </button>
                )}

                <div className="navbar-mobile-divider" />

                <button onClick={handleLogout} className="navbar-mobile-link navbar-mobile-logout">
                  <LogOut size={17} /> <span>Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/" className="navbar-mobile-link" onClick={closeMobile}>
                  <Home size={17} /> <span>Beranda</span>
                </Link>
                <div className="navbar-mobile-divider" />
                <div className="navbar-mobile-auth">
                  <Link to="/login" onClick={closeMobile}>
                    <Button variant="light" size="sm">Masuk</Button>
                  </Link>
                  <Link to="/register" onClick={closeMobile}>
                    <Button variant="secondary" size="sm">Daftar</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
