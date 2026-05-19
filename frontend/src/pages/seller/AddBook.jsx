import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { bookService } from '../../services/bookService';
import Typography from '../../components/atoms/Typography';
import Button from '../../components/atoms/Button';
import FormField from '../../components/molecules/FormField';
import { useToast } from '../../context/ToastContext';
import { Upload, ArrowLeft } from 'lucide-react';
import '../admin/AdminPages.css';
import '../../components/atoms/Input.css';

const AddBook = () => {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category_id: '',
    condition: 'good',
    description: '',
    price: '',
    stock: ''
  });
  const [images, setImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await adminService.getCategories();
        if (res.success) setCategories(res.data);
      } catch (err) {
        console.error('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.warning('Maksimal 5 foto per buku!');
      return;
    }
    
    setImages(prev => [...prev, ...files]);
    
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreview(prev => [...prev, ...previews]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreview(imagePreview.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id) {
      toast.warning('Silakan pilih kategori');
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    
    images.forEach(image => {
      data.append('images', image);
    });

    try {
      setLoading(true);
      const res = await bookService.addBook(data);
      if (res.success) {
        toast.success('Buku berhasil ditambahkan dan menunggu persetujuan Admin.');
        navigate('/seller/books');
      } else {
        toast.error(res.message || 'Gagal menambahkan buku');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/seller/books')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <Typography variant="h3" weight="bold">Tambah Buku Baru</Typography>
            <Typography variant="body" color="muted">Lengkapi detail buku yang ingin Anda jual</Typography>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField 
              label="Judul Buku *" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Contoh: Kalkulus Lanjut" 
              required 
            />
            <FormField 
              label="Penulis *" 
              name="author" 
              value={formData.author} 
              onChange={handleChange} 
              placeholder="Contoh: James Stewart" 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField 
              label="ISBN (Opsional)" 
              name="isbn" 
              value={formData.isbn} 
              onChange={handleChange} 
              placeholder="ISBN Buku" 
            />
            <div className="input-group">
              <label className="input-label">Kategori *</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                className="input-control"
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Kondisi *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                required
                className="input-control"
              >
                <option value="like_new">Seperti Baru</option>
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="poor">Buruk</option>
              </select>
            </div>
            <FormField 
              label="Harga (Rp) *" 
              name="price" 
              type="number" 
              value={formData.price} 
              onChange={handleChange} 
              min="0" 
              required 
            />
            <FormField 
              label="Stok *" 
              name="stock" 
              type="number" 
              value={formData.stock} 
              onChange={handleChange} 
              min="1" 
              required 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Deskripsi *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
              className="input-control"
              placeholder="Jelaskan detail buku, minus (jika ada), dsb."
            ></textarea>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
              Foto Buku (Maks. 5) *
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {imagePreview.map((src, index) => (
                <div key={index} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label style={{ width: '100px', height: '100px', border: '2px dashed var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <Upload size={24} />
                  <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Upload</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageChange} 
                    style={{ display: 'none' }} 
                  />
                </label>
              )}
            </div>
            <Typography variant="xs" color="muted" className="mt-2">Foto pertama akan menjadi cover utama buku Anda.</Typography>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => navigate('/seller/books')} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Simpan Buku
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBook;
