import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import Typography from '../../components/atoms/Typography';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import ConfirmDialog from '../../components/atoms/ConfirmDialog';
import SearchBar from '../../components/molecules/SearchBar';
import { useToast } from '../../context/ToastContext';
import { Book, Plus, Edit, Trash2 } from 'lucide-react';
import '../admin/AdminPages.css';

const SellerBooks = () => {
  const toast = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await bookService.getSellerBooks({ search: searchQuery || undefined, limit: 100 });
      if (res.success) {
        setBooks(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat buku');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [searchQuery]);

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await bookService.deleteBook(deleteDialog);
      if (res.success) {
        setBooks(books.filter(b => b.id !== deleteDialog));
        toast.success('Buku berhasil dihapus.');
      } else {
        toast.error(res.message || 'Gagal menghapus buku');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan saat menghapus buku');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchBooks} variant="outline" className="mt-4">Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <ConfirmDialog
        open={!!deleteDialog}
        variant="danger"
        title="Hapus Buku?"
        message="Buku ini akan dihapus secara permanen dari koleksi Anda."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isLoading={deleteLoading}
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog(null)}
      />
      <div className="admin-page-header">
        <div>
          <Typography variant="h3" weight="bold">Buku Saya</Typography>
          <Typography variant="body" color="muted">Kelola koleksi buku yang Anda jual</Typography>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: '250px' }}>
            <SearchBar onSearch={(q) => setSearchQuery(q)} placeholder="Cari judul..." />
          </div>
          <Button 
            variant="primary" 
            leftIcon={<Plus size={18} />} 
            onClick={() => navigate('/seller/books/add')}
          >
            Tambah Buku
          </Button>
        </div>
      </div>

      <div className="admin-card">
        {books.length === 0 ? (
          <div className="admin-empty">
            <Book size={48} color="var(--color-surface-400)" />
            <Typography variant="h5" className="mt-4">Belum ada buku</Typography>
            <Typography color="muted">Anda belum menambahkan buku untuk dijual.</Typography>
            <Button 
              variant="primary" 
              className="mt-4" 
              onClick={() => navigate('/seller/books/add')}
            >
              Tambah Buku Sekarang
            </Button>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Info Buku</th>
                  <th>Kategori</th>
                  <th>Kondisi</th>
                  <th>Harga & Stok</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {books.map(book => (
                  <tr key={book.id}>
                    <td>
                      <div className="admin-table-cell-content">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="admin-table-avatar" style={{ borderRadius: '4px' }} />
                        ) : (
                          <div className="admin-table-avatar-fallback" style={{ borderRadius: '4px' }}>
                            <Book size={20} />
                          </div>
                        )}
                        <div>
                          <Typography variant="small" weight="bold">{book.title}</Typography>
                          <Typography variant="xs" color="muted">{book.author}</Typography>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Typography variant="small">{book.category_name || '-'}</Typography>
                    </td>
                    <td>
                      <Badge variant={book.condition === 'like_new' ? 'success' : 'neutral'}>
                        {book.condition?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <div>
                        <Typography variant="small" weight="bold">Rp {parseInt(book.price).toLocaleString('id-ID')}</Typography>
                        <Typography variant="xs" color="muted">Stok: {book.stock}</Typography>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Badge variant={book.is_approved ? 'success' : 'warning'}>
                          {book.is_approved ? 'Disetujui' : 'Menunggu Approval'}
                        </Badge>
                        <Badge variant={book.is_available ? 'info' : 'error'}>
                          {book.is_available ? 'Tersedia' : 'Disembunyikan'}
                        </Badge>
                      </div>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        {/* 
                        <Button variant="outline" size="sm" onClick={() => navigate(`/seller/books/edit/${book.id}`)}>
                          <Edit size={16} />
                        </Button>
                        */}
                        
                        <Button variant="danger" size="sm" onClick={() => setDeleteDialog(book.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerBooks;
