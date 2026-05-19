import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { bookService } from '../../services/bookService';
import Typography from '../../components/atoms/Typography';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import ConfirmDialog from '../../components/atoms/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { CheckCircle, XCircle, Trash2, Eye, X, BookOpen, Package, Tag, User, Star } from 'lucide-react';
import './AdminPages.css';

// ─── Condition map ─────────────────────────────────────────
const conditionMap = {
  like_new: { label: 'Seperti Baru', variant: 'success' },
  good:     { label: 'Kondisi Bagus', variant: 'primary' },
  fair:     { label: 'Kondisi Cukup', variant: 'warning' },
  poor:     { label: 'Bekas Pakai', variant: 'neutral' },
};

const formatPrice = (p) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

// ─── Book Detail Modal ─────────────────────────────────────
const BookDetailModal = ({ bookId, onClose, onApprove, onReject }) => {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await bookService.getById(bookId);
        if (res.success) setBook(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookId]);

  const cond = book ? (conditionMap[book.condition] || { label: book.condition, variant: 'neutral' }) : null;
  const images = book
    ? (book.images && book.images.length > 0
        ? book.images
        : book.cover_url ? [{ url: book.cover_url, id: 0 }] : [])
    : [];

  return (
    <div className="img-modal-overlay" onClick={onClose}>
      <div
        className="book-detail-modal-box"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="img-modal-header">
          <span className="img-modal-title">Detail Buku — Review Admin</span>
          <button className="img-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="book-detail-modal-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Spinner size="lg" />
            </div>
          ) : !book ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              Gagal memuat detail buku.
            </p>
          ) : (
            <div className="book-dm-grid">
              {/* Left: Images */}
              <div className="book-dm-images">
                <div className="book-dm-main-img">
                  {images.length > 0 ? (
                    <img src={images[activeImg]?.url} alt={book.title} />
                  ) : (
                    <div className="book-dm-no-img">
                      <BookOpen size={48} strokeWidth={1} />
                      <span>Tidak ada foto</span>
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="book-dm-thumbs">
                    {images.map((img, i) => (
                      <button
                        key={img.id || i}
                        className={`book-dm-thumb ${i === activeImg ? 'active' : ''}`}
                        onClick={() => setActiveImg(i)}
                      >
                        <img src={img.url} alt={`Foto ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Info */}
              <div className="book-dm-info">
                {book.category_name && (
                  <span className="book-dm-category">{book.category_name}</span>
                )}
                <h2 className="book-dm-title">{book.title}</h2>
                <p className="book-dm-author">oleh {book.author}</p>

                <div className="book-dm-price-row">
                  <span className="book-dm-price">{formatPrice(book.price)}</span>
                  {cond && <Badge variant={cond.variant}>{cond.label}</Badge>}
                  <Badge variant={book.is_approved ? 'success' : 'warning'}>
                    {book.is_approved ? 'Sudah Disetujui' : 'Menunggu Review'}
                  </Badge>
                </div>

                <div className="book-dm-attrs">
                  {book.isbn && (
                    <div className="book-dm-attr">
                      <Tag size={14} />
                      <span>ISBN: {book.isbn}</span>
                    </div>
                  )}
                  <div className="book-dm-attr">
                    <Package size={14} />
                    <span>Stok: {book.stock}</span>
                  </div>
                  <div className="book-dm-attr">
                    <User size={14} />
                    <span>Penjual: {book.seller_name}</span>
                  </div>
                  {book.review_count > 0 && (
                    <div className="book-dm-attr">
                      <Star size={14} />
                      <span>Rating: {parseFloat(book.avg_rating).toFixed(1)} ({book.review_count} ulasan)</span>
                    </div>
                  )}
                </div>

                {book.description && (
                  <div className="book-dm-desc">
                    <h4>Deskripsi</h4>
                    <p>{book.description}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="book-dm-actions">
                  {!book.is_approved ? (
                    <button className="book-dm-btn book-dm-btn--approve" onClick={() => onApprove(book.id)}>
                      <CheckCircle size={16} /> Setujui Buku Ini
                    </button>
                  ) : (
                    <button className="book-dm-btn book-dm-btn--reject" onClick={() => onReject(book.id)}>
                      <XCircle size={16} /> Batalkan Persetujuan
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────
const AdminBooks = () => {
  const toast = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [previewBookId, setPreviewBookId] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(null); // { id, isApproved }
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null); // bookId
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await adminService.getBooks({ limit: 50 });
      if (res.success) setBooks(res.data);
    } catch (err) {
      setError('Gagal memuat data buku');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleApproval = (id, isApproved) => {
    setApprovalDialog({ id, isApproved });
  };

  const executeApproval = async () => {
    const { id, isApproved } = approvalDialog;
    setApprovalLoading(true);
    try {
      await adminService.approveBook(id, isApproved);
      setPreviewBookId(null);
      toast.success(isApproved ? 'Buku berhasil disetujui.' : 'Buku berhasil ditolak.');
      fetchBooks();
    } catch (err) {
      toast.error('Gagal mengupdate status buku');
    } finally {
      setApprovalLoading(false);
      setApprovalDialog(null);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog(id);
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminService.deleteBook(deleteDialog);
      toast.success('Buku berhasil dihapus.');
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus buku');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog(null);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  if (loading) return <Spinner size="lg" className="mt-8" />;
  if (error) return <Typography color="danger">{error}</Typography>;

  return (
    <div className="admin-page-container">
      {/* Book Detail Modal */}
      {previewBookId && (
        <BookDetailModal
          bookId={previewBookId}
          onClose={() => setPreviewBookId(null)}
          onApprove={(id) => handleApproval(id, true)}
          onReject={(id) => handleApproval(id, false)}
        />
      )}

      {/* Confirm: Approval */}
      <ConfirmDialog
        open={!!approvalDialog}
        variant={approvalDialog?.isApproved ? 'success' : 'warning'}
        title={approvalDialog?.isApproved ? 'Setujui Buku Ini?' : 'Tolak Buku Ini?'}
        message={approvalDialog?.isApproved
          ? 'Buku akan dipublikasikan dan bisa ditemukan oleh pembeli.'
          : 'Buku akan ditarik dari marketplace dan penjual akan diberitahu.'}
        confirmLabel={approvalDialog?.isApproved ? 'Ya, Setujui' : 'Ya, Tolak'}
        cancelLabel="Batal"
        isLoading={approvalLoading}
        onConfirm={executeApproval}
        onCancel={() => setApprovalDialog(null)}
      />

      {/* Confirm: Delete */}
      <ConfirmDialog
        open={!!deleteDialog}
        variant="danger"
        title="Hapus Buku?"
        message="Buku akan dihapus secara permanen dan tidak dapat dikembalikan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isLoading={deleteLoading}
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog(null)}
      />

      <div className="admin-header">
        <div>
          <Typography variant="h4" weight="bold">Manajemen Buku</Typography>
          <Typography variant="small" color="muted">Tinjau dan setujui buku baru yang diposting oleh penjual.</Typography>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Buku</th>
                <th>Penjual</th>
                <th>Harga & Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.id}>
                  <td>
                    <div className="admin-user-cell">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '40px', height: '50px', backgroundColor: '#e4e6eb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookOpen size={18} color="#aaa" />
                        </div>
                      )}
                      <div className="admin-user-details">
                        <span className="admin-user-name" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</span>
                        <span className="admin-user-email">{book.category_name || 'Tanpa Kategori'}</span>
                        <span className="admin-user-email" style={{ fontStyle: 'italic' }}>oleh {book.author}</span>
                      </div>
                    </div>
                  </td>
                  <td>{book.seller_name}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(book.price)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Stok: {book.stock}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant={book.is_approved ? 'success' : 'warning'}>
                      {book.is_approved ? 'Disetujui' : 'Menunggu Review'}
                    </Badge>
                  </td>
                  <td>
                    <div className="admin-action-buttons">
                      {/* Tombol Lihat Detail — selalu tampil */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setPreviewBookId(book.id)}
                        title="Lihat detail buku"
                      >
                        <Eye size={14} /> Detail
                      </Button>

                      {/* Setujui / Tolak langsung juga tersedia */}
                      {!book.is_approved ? (
                        <Button variant="success" size="sm" onClick={() => handleApproval(book.id, true)}>
                          <CheckCircle size={14} /> Setujui
                        </Button>
                      ) : (
                        <Button variant="warning" size="sm" onClick={() => handleApproval(book.id, false)}>
                          <XCircle size={14} /> Tolak
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteClick(book.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada buku.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBooks;
