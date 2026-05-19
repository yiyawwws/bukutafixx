import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import Button from '../atoms/Button';
import { useToast } from '../../context/ToastContext';
import { reviewService } from '../../services/reviewService';
import './ReviewModal.css';

const ReviewModal = ({ order, onClose, onSuccess }) => {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Pilih jumlah bintang terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const res = await reviewService.submitOrderReview(order.id, rating, comment);
      if (res.success) {
        onSuccess(order.id, { rating, comment });
      } else {
        toast.error(res.message || 'Gagal menyimpan ulasan');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-modal-overlay">
      <div className="review-modal-content">
        <div className="review-modal-header">
          <h3>Beri Ulasan</h3>
          <button className="review-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="review-modal-form">
          <p className="review-modal-desc">
            Bagaimana pengalaman Anda membeli buku di pesanan #{order.id}?
          </p>

          <div className="review-stars-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={36}
                className={`review-star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          <div className="review-rating-label">
            {rating === 1 && 'Sangat Buruk'}
            {rating === 2 && 'Buruk'}
            {rating === 3 && 'Cukup'}
            {rating === 4 && 'Bagus'}
            {rating === 5 && 'Sangat Bagus!'}
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Komentar (Opsional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tulis pendapat Anda tentang buku atau pelayanan penjual..."
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="review-modal-actions">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Kirim Ulasan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
