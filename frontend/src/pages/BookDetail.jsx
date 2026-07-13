import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, MessageCircle, Star, ChevronLeft,
  Package, Tag, BookOpen, User, CheckCircle, GraduationCap
} from 'lucide-react';
import Typography from '../components/atoms/Typography';
import Button from '../components/atoms/Button';
import Badge from '../components/atoms/Badge';
import Spinner from '../components/atoms/Spinner';
import { bookService } from '../services/bookService';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './BookDetail.css';

const conditionMap = {
  like_new: { label: 'Seperti Baru', variant: 'success' },
  good:     { label: 'Kondisi Bagus', variant: 'primary' },
  fair:     { label: 'Kondisi Cukup', variant: 'warning' },
  poor:     { label: 'Bekas Pakai', variant: 'neutral' },
};

const formatPrice = (p) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const toast = useToast();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const [bookRes, reviewRes] = await Promise.all([
          bookService.getById(id),
          bookService.getReviews(id),
        ]);
        if (bookRes.success) setBook(bookRes.data);
        if (reviewRes.success) setReviews(reviewRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    setAdding(true);
    const res = await addToCart(book.id, quantity);
    setAdding(false);
    if (res.success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    } else {
      toast.error(res.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <Typography variant="h4" weight="bold" className="mb-4">Buku tidak ditemukan</Typography>
        <Link to="/"><Button variant="primary">Kembali ke Beranda</Button></Link>
      </div>
    );
  }

  const cond = conditionMap[book.condition] || { label: book.condition, variant: 'neutral' };
  const images = book.images && book.images.length > 0
    ? book.images
    : book.cover_url ? [{ url: book.cover_url, id: 0 }] : [];

  return (
    <div className="book-detail container">
      {/* Breadcrumb */}
      <nav className="book-detail-breadcrumb">
        <Link to="/" className="breadcrumb-link">
          <ChevronLeft size={16} />
          <span>Kembali ke Daftar Buku</span>
        </Link>
      </nav>

      {/* Main layout */}
      <div className="book-detail-grid">
        {/* Left: Images */}
        <div className="book-detail-images">
          <div className="book-main-image card">
            {images.length > 0 ? (
              <img src={images[activeImg]?.url} alt={book.title} />
            ) : (
              <div className="book-no-image">
                <BookOpen size={64} strokeWidth={1} />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="book-thumbnails">
              {images.map((img, i) => (
                <button
                  key={img.id || i}
                  className={`book-thumb ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={img.url} alt={`Foto ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="book-detail-info">
          {book.category_name && (
            <Typography variant="caption" className="book-detail-category">
              {book.category_name}
            </Typography>
          )}

          <Typography variant="h2" weight="bold" className="book-detail-title">
            {book.title}
          </Typography>

          <Typography variant="h5" color="muted" className="book-detail-author">
            oleh {book.author}
          </Typography>

          {book.seller_name && (
            <Typography variant="body" className="mt-2" style={{ color: 'var(--color-primary)' }}>
              Penjual: <strong>{book.seller_name}</strong>
            </Typography>
          )}

          {/* Rating */}
          {book.review_count > 0 ? (
            <div className="book-detail-rating">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={18}
                  fill={i < Math.round(book.avg_rating) ? '#FFB300' : 'none'}
                  stroke={i < Math.round(book.avg_rating) ? '#FFB300' : '#CED0D4'}
                />
              ))}
              <span className="book-detail-rating-text">
                {parseFloat(book.avg_rating).toFixed(1)} ({book.review_count} ulasan)
              </span>
            </div>
          ) : (
            <div className="book-detail-rating">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={18}
                  fill="none"
                  stroke="#CED0D4"
                />
              ))}
              <span className="book-detail-rating-text" style={{ color: 'var(--color-text-muted)' }}>
                Belum ada rating
              </span>
            </div>
          )}

          <div className="book-detail-price-row">
            <Typography variant="h2" weight="bold" className="book-detail-price">
              {formatPrice(book.price)}
            </Typography>
            <Badge variant={cond.variant}>{cond.label}</Badge>
          </div>

          {/* Attributes */}
          <div className="book-detail-attrs">
            {book.isbn && (
              <div className="book-attr-item">
                <Tag size={15} />
                <span>ISBN: {book.isbn}</span>
              </div>
            )}
            <div className="book-attr-item">
              <Package size={15} />
              <span>Stok: {book.stock} tersedia</span>
            </div>
            {book.seller_name && (
              <div className="book-attr-item">
                <User size={15} />
                <span>Dijual oleh: {book.seller_name}</span>
              </div>
            )}
            <div className="book-attr-item">
              <GraduationCap size={15} />
              <span>Asal kampus: {book.seller_university || 'Belum tersedia'}</span>
            </div>
          </div>

          {/* Description */}
          {book.description && (
            <div className="book-detail-desc">
              <h4>Deskripsi</h4>
              <p>{book.description}</p>
            </div>
          )}

          {/* Actions — sembunyikan untuk admin */}
          <div className="book-detail-actions">
            {user?.role === 'admin' ? (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'var(--color-surface-100)',
                border: '1px dashed var(--color-border)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem'
              }}>
                👤 Admin tidak dapat membeli buku.
              </div>
            ) : (
              <>
                {!addedSuccess && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', width: '100%' }}>
                    <Typography variant="body" weight="bold">Jumlah:</Typography>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        style={{ padding: '0.5rem 1rem', background: 'var(--color-surface-100)', border: 'none', cursor: 'pointer' }}
                      >-</button>
                      <input 
                        type="number" 
                        min="1" 
                        max={book.stock} 
                        value={quantity} 
                        onChange={(e) => setQuantity(Math.max(1, Math.min(book.stock, parseInt(e.target.value) || 1)))}
                        style={{ width: '50px', padding: '0.5rem', border: 'none', textAlign: 'center', WebkitAppearance: 'none', margin: 0 }}
                      />
                      <button 
                        onClick={() => setQuantity(Math.min(book.stock, quantity + 1))}
                        style={{ padding: '0.5rem 1rem', background: 'var(--color-surface-100)', border: 'none', cursor: 'pointer' }}
                      >+</button>
                    </div>
                    <Typography variant="xs" color="muted">Tersisa {book.stock}</Typography>
                  </div>
                )}

                {addedSuccess ? (
                  <div className="book-added-success">
                    <CheckCircle size={20} />
                    <span>Berhasil ditambahkan ke keranjang!</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={<ShoppingCart size={18} />}
                    onClick={handleAddToCart}
                    isLoading={adding}
                  >
                    Tambah ke Keranjang
                  </Button>
                )}

                {book.seller_whatsapp ? (
                  <a
                    href={`${book.seller_whatsapp}?text=${encodeURIComponent(`Halo, saya tertarik dengan buku "${book.title}" di Bukuta. Apakah masih tersedia?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ width: '100%' }}
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      fullWidth
                      leftIcon={<MessageCircle size={18} />}
                      style={{
                        borderColor: '#25D366',
                        color: '#25D366',
                        fontWeight: 600,
                      }}
                    >
                      Chat Penjual via WhatsApp
                    </Button>
                  </a>
                ) : (
                  <p style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    padding: '0.5rem 0',
                  }}>
                    Nomor WhatsApp penjual belum tersedia.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="book-reviews">
          <Typography variant="h4" weight="bold" className="book-reviews-title">
            Ulasan Pembeli ({reviews.length})
          </Typography>
          <div className="book-reviews-list">
            {reviews.map((r) => (
              <div key={r.id} className="book-review-item card">
                <div className="book-review-header">
                  <div className="book-review-stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < r.skor_bintang ? '#FFB300' : 'none'}
                        stroke={i < r.skor_bintang ? '#FFB300' : '#CED0D4'}
                      />
                    ))}
                  </div>
                  <span className="book-review-date">
                    {new Date(r.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
                {r.komentar && <p className="book-review-text">{r.komentar}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BookDetail;
