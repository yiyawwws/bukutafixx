import React, { useState, useEffect } from 'react';
import Typography from '../../components/atoms/Typography';
import Spinner from '../../components/atoms/Spinner';
import { Star, MessageSquare } from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import './SellerReviews.css';

const SellerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, avg: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await reviewService.getSellerReviews();
        if (res.success) {
          setReviews(res.data.reviews || []);
          setStats({
            total: res.data.total_reviews || 0,
            avg: res.data.avg_rating || 0
          });
        }
      } catch (err) {
        setError('Gagal memuat ulasan.');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size="lg" /></div>;
  if (error) return <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>;

  return (
    <div className="seller-reviews-page">
      <Typography variant="h3" weight="bold" className="mb-4">Ulasan Pembeli</Typography>
      
      <div className="seller-reviews-stats">
        <div className="stat-card">
          <div className="stat-icon"><Star size={24} color="#FBBF24" /></div>
          <div className="stat-info">
            <span className="stat-label">Rata-rata Rating</span>
            <strong className="stat-value">{stats.avg} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/ 5.0</span></strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><MessageSquare size={24} color="var(--color-primary-500)" /></div>
          <div className="stat-info">
            <span className="stat-label">Total Ulasan</span>
            <strong className="stat-value">{stats.total}</strong>
          </div>
        </div>
      </div>

      <div className="seller-reviews-list">
        {reviews.length === 0 ? (
          <div className="empty-reviews">Belum ada ulasan dari pembeli.</div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="seller-review-card">
              <div className="seller-review-header">
                <div>
                  <strong>{review.buyer_name}</strong>
                  <span className="seller-review-book">{review.book_title}</span>
                </div>
                <div className="seller-review-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? '#FBBF24' : 'none'} color={i < review.rating ? '#FBBF24' : 'var(--color-surface-400)'} />
                  ))}
                </div>
              </div>
              {review.comment && <p className="seller-review-comment">"{review.comment}"</p>}
              <span className="seller-review-date">
                {new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SellerReviews;
