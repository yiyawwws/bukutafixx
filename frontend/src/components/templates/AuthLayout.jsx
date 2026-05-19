import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BookOpen, ShieldCheck } from 'lucide-react';
import './AuthLayout.css';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      {/* Left panel — branding */}
      <div className="auth-left">
        <div className="auth-left-content">
          <Link to="/" className="auth-brand-logo">
            <div className="auth-brand-icon">
              <BookOpen size={32} color="#fff" />
            </div>
            <span>Bukuta</span>
          </Link>
          <h2 className="auth-left-headline">
            Marketplace buku terpercaya untuk mahasiswa
          </h2>
          <p className="auth-left-sub">
            Temukan buku kuliah dengan harga terjangkau atau jual buku bekas kamu dengan aman dan mudah.
          </p>
          <div className="auth-left-features">
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Pembayaran aman dengan sistem escrow</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Verifikasi identitas mahasiswa</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Ribuan buku dari kampus seluruh Indonesia</span>
            </div>
          </div>
          <div className="auth-left-trust">
            <ShieldCheck size={16} />
            <span>Terverifikasi & terpercaya</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-form-container">
          <Link to="/" className="auth-back-link">← Kembali ke Beranda</Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
