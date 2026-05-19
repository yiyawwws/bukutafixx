import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import Typography from '../../components/atoms/Typography';
import Button from '../../components/atoms/Button';
import Input from '../../components/atoms/Input';
import Spinner from '../../components/atoms/Spinner';
import ConfirmDialog from '../../components/atoms/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Trash2, Plus } from 'lucide-react';
import './AdminPages.css';

const AdminCategories = () => {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null); // catId
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await adminService.getCategories();
      if (res.success) setCategories(res.data);
    } catch (err) {
      setError('Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await adminService.createCategory({ name: newCategory });
      setNewCategory('');
      toast.success('Kategori berhasil ditambahkan.');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan kategori');
    }
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminService.deleteCategory(deleteDialog);
      toast.success('Kategori berhasil dihapus.');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kategori');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog(null);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-8" />;
  if (error) return <Typography color="danger">{error}</Typography>;

  return (
    <div className="admin-page-container">
      <ConfirmDialog
        open={!!deleteDialog}
        variant="danger"
        title="Hapus Kategori?"
        message="Kategori ini akan dihapus secara permanen. Buku di kategori ini tidak akan terhapus."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isLoading={deleteLoading}
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog(null)}
      />

      <div className="admin-header">
        <div>
          <Typography variant="h4" weight="bold">Kategori Buku</Typography>
          <Typography variant="small" color="muted">Kelola klasifikasi buku di sistem Bukuta.</Typography>
        </div>
      </div>

      <div className="admin-table-card" style={{ padding: '1.5rem', marginBottom: '1rem', background: 'var(--color-surface-50)' }}>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Tambah Kategori Baru</label>
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Contoh: Teknik Informatika"
              required
            />
          </div>
          <Button type="submit" variant="primary">
            <Plus size={18} /> Tambah
          </Button>
        </form>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th>Slug</th>
                <th>Jumlah Buku Aktif</th>
                <th style={{ width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{cat.slug}</td>
                  <td>{cat.book_count || 0} buku</td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteDialog(cat.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada kategori.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCategories;
