import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, MessageSquare, Send, Mail } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import './Footer.css';

const Footer = () => {
  const { user } = useContext(AuthContext);

  const getJualBukuLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'seller' && user.active_role === 'seller') return '/seller/books/add';
    if (user.role === 'seller') return '/seller/dashboard';
    return '/profile';
  };
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <div className="footer-logo-icon">
              <BookOpen size={20} color="#fff" />
            </div>
            <span>Bukuta</span>
          </Link>
          <p className="footer-tagline">
            Marketplace buku bekas & baru terpercaya untuk mahasiswa Indonesia.
          </p>
          <div className="footer-socials">
            <a href="#" className="footer-social-btn" aria-label="Instagram"><MessageSquare size={16} /></a>
            <a href="#" className="footer-social-btn" aria-label="Twitter"><Send size={16} /></a>
            <a href="mailto:hello@bukuta.id" className="footer-social-btn" aria-label="Email"><Mail size={16} /></a>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4 className="footer-col-title">Marketplace</h4>
            <Link to="/" className="footer-link">Cari Buku</Link>
            <Link to={getJualBukuLink()} className="footer-link">Jual Buku</Link>
            <Link to="/cart" className="footer-link">Keranjang</Link>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Informasi</h4>
            <Link to="/about" className="footer-link">Tentang Kami</Link>
            <Link to="/how-it-works" className="footer-link">Cara Kerja</Link>
            <Link to="/privacy" className="footer-link">Kebijakan Privasi</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom container">
        <p>© {new Date().getFullYear()} Bukuta. Dibuat dengan <Heart size={12} fill="currentColor" /> untuk mahasiswa.</p>
      </div>
    </footer>
  );
};

export default Footer;
