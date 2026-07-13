import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, BookOpen } from 'lucide-react';
import Typography from '../atoms/Typography';
import Badge from '../atoms/Badge';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './ProductCard.css';

const conditionMap = {
  like_new: { label: 'Seperti Baru', variant: 'success' },
  good:     { label: 'Bagus',       variant: 'primary' },
  fair:     { label: 'Cukup',       variant: 'warning' },
  poor:     { label: 'Bekas',       variant: 'neutral' },
};

const formatPrice = (price) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(price);

const ProductCard = ({ book }) => {
  const { id, title, author, price, cover_url, condition, category_name, avg_rating, review_count, seller_name } = book;
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();

  const cond = conditionMap[condition] || { label: condition, variant: 'neutral' };
  const rating = parseFloat(avg_rating) || 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await addToCart(id);
      if (!res.success) {
        toast.error(res.message);
      } else {
        toast.success('Buku ditambahkan ke keranjang!');
      }
    } catch (err) {
      console.error('Add to cart failed:', err);
    }
  };

  return (
    <Link to={`/books/${id}`} className="product-card">
      <div className="product-card-image">
        {cover_url ? (
          <img
            src={cover_url}
            alt={title}
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.parentElement.classList.add('no-image'); }}
          />
        ) : (
          <div className="product-card-no-image">
            <BookOpen size={40} strokeWidth={1.5} />
          </div>
        )}
        <div className="product-card-badges">
          <Badge variant={cond.variant}>{cond.label}</Badge>
        </div>
        <button
          className="product-card-cart-btn"
          onClick={handleAddToCart}
          title="Tambah ke Keranjang"
          aria-label="Tambah ke Keranjang"
        >
          <ShoppingCart size={16} />
          <span>Keranjang</span>
        </button>
      </div>

      <div className="product-card-content">
        {category_name && (
          <Typography variant="caption" color="muted" className="product-card-category">
            {category_name}
          </Typography>
        )}
        <Typography variant="h6" weight="semibold" className="product-card-title">
          {title}
        </Typography>
        <Typography variant="small" color="muted" className="product-card-author">
          {author}
        </Typography>
        {seller_name && (
          <Typography variant="caption" color="muted" className="product-card-seller">
            Penjual: {seller_name}
          </Typography>
        )}

        <div className="product-card-footer">
          <Typography variant="h5" weight="bold" className="product-card-price">
            {formatPrice(price)}
          </Typography>
          {review_count > 0 && (
            <div className="product-card-rating">
              <Star size={12} fill="#FFB300" stroke="none" />
              <span>{rating.toFixed(1)}</span>
              <span className="product-card-review-count">({review_count})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
