import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, BookOpen, ArrowRight, AlertCircle } from 'lucide-react';
import Typography from '../components/atoms/Typography';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { cartService } from '../services/cartService';
import './Cart.css';

const formatPrice = (p) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

const Cart = () => {
  const { cart, loading, fetchCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [removing, setRemoving] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [showVerifWarning, setShowVerifWarning] = useState(false);
  const navigate = useNavigate();

  const handleRemove = async (itemId) => {
    setRemoving(itemId);
    try {
      await cartService.removeItem(itemId);
      await fetchCart();
    } catch (err) {
      console.error(err);
    } finally {
      setRemoving(null);
    }
  };

  const handleQty = async (itemId, newQty) => {
    if (newQty < 1) return;
    setUpdating(itemId);
    try {
      await cartService.updateQuantity(itemId, newQty);
      await fetchCart();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="cart-page container">
      <div className="cart-header">
        <ShoppingCart size={28} className="text-primary" />
        <Typography variant="h3" weight="bold">Keranjang Belanja</Typography>
        {cart.length > 0 && (
          <span className="cart-count">{cart.length} item</span>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty-icon">
            <ShoppingCart size={64} strokeWidth={1} />
          </div>
          <Typography variant="h4" weight="bold" className="mb-2">
            Keranjangmu kosong
          </Typography>
          <Typography color="muted" className="mb-6">
            Temukan buku yang kamu butuhkan dan tambahkan ke keranjang.
          </Typography>
          <Link to="/">
            <Button variant="primary" size="lg" leftIcon={<BookOpen size={18} />}>
              Cari Buku Sekarang
            </Button>
          </Link>
        </div>
      ) : (
        <div className="cart-grid">
          {/* Items list */}
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item card">
                <Link to={`/books/${item.book_id}`} className="cart-item-image">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} />
                  ) : (
                    <div className="cart-item-no-image">
                      <BookOpen size={32} strokeWidth={1} />
                    </div>
                  )}
                </Link>

                <div className="cart-item-info">
                  <Link to={`/books/${item.book_id}`} className="cart-item-title">
                    {item.title}
                  </Link>
                  <p className="cart-item-author">{item.author}</p>
                  <p className="cart-item-price">{formatPrice(item.price)}</p>
                </div>

                <div className="cart-item-controls">
                  <div className="cart-qty">
                    <button
                      className="cart-qty-btn"
                      onClick={() => handleQty(item.id, item.quantity - 1)}
                      disabled={updating === item.id || item.quantity <= 1}
                      aria-label="Kurangi"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="cart-qty-value">
                      {updating === item.id ? '...' : item.quantity}
                    </span>
                    <button
                      className="cart-qty-btn"
                      onClick={() => handleQty(item.id, item.quantity + 1)}
                      disabled={updating === item.id}
                      aria-label="Tambah"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="cart-item-subtotal">{formatPrice(item.price * item.quantity)}</p>

                  <button
                    className="cart-item-remove"
                    onClick={() => handleRemove(item.id)}
                    disabled={removing === item.id}
                    aria-label="Hapus"
                  >
                    {removing === item.id ? '...' : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <aside className="cart-summary card">
            <Typography variant="h5" weight="bold" className="mb-4">Ringkasan Pesanan</Typography>

            <div className="cart-summary-row">
              <span>Subtotal ({cart.length} item)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="cart-summary-row muted">
              <span>Biaya layanan</span>
              <span>Gratis</span>
            </div>

            <hr className="cart-summary-divider" />

            <div className="cart-summary-row total">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {showVerifWarning && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
                background: '#fff7ed',
                border: '1px solid #f97316',
                borderRadius: '0.625rem',
                padding: '0.875rem 1rem',
                marginBottom: '0.75rem',
                color: '#9a3412',
                fontSize: '0.875rem',
                lineHeight: '1.4',
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px', color: '#f97316' }} />
                <span>
                  <strong>Akun belum diverifikasi.</strong> Akun Anda masih menunggu verifikasi dari admin.
                  Anda tidak dapat melakukan checkout hingga akun diverifikasi.
                </span>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-4"
              rightIcon={<ArrowRight size={18} />}
              onClick={() => {
                if (user && !user.is_verified && user.role !== 'admin') {
                  setShowVerifWarning(true);
                  return;
                }
                navigate('/checkout');
              }}
            >
              Lanjutkan Checkout
            </Button>

            <Link to="/" className="cart-continue-shopping">
              ← Lanjut Belanja
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
