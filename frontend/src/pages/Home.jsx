import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Typography from '../components/atoms/Typography';
import Button from '../components/atoms/Button';
import ProductCard from '../components/molecules/ProductCard';
import SearchBar from '../components/molecules/SearchBar';
import Spinner from '../components/atoms/Spinner';
import { bookService } from '../services/bookService';
import './Home.css';

const CATEGORIES = [
  { label: 'Semua', slug: '' },
  { label: 'Teknik', slug: 'teknik' },
  { label: 'Ekonomi', slug: 'ekonomi' },
  { label: 'Hukum', slug: 'hukum' },
  { label: 'Kedokteran', slug: 'kedokteran' },
  { label: 'MIPA', slug: 'mipa' },
  { label: 'Sosial', slug: 'sosial' },
];

const Home = () => {
  const [books, setBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const fetchBooks = useCallback(async (search = '', category = '') => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const data = await bookService.getAvailable(params);
      if (data.success) {
        setBooks(data.data || []);
        setTotalBooks(data.total || data.data?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch books', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks(searchQuery, activeCategory);
  }, [searchQuery, activeCategory, fetchBooks]);

  const handleSearch = (query) => {
    if (query) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  const handleCategory = (slug) => {
    setActiveCategory(slug);
    setSearchParams({});
  };

  const isSearching = searchQuery || activeCategory;

  return (
    <div className="home">
      {/* Hero Section */}
      {!isSearching && (
        <section className="home-hero">
          <div className="container home-hero-inner">
            <div className="home-hero-text fade-in-up">
              <div className="home-hero-eyebrow">🎓 Marketplace Buku Mahasiswa #1</div>
              <Typography variant="h1" className="home-hero-title">
                Temukan Buku Kuliah<br />
                <span className="home-hero-highlight">Impianmu</span> di Bukuta
              </Typography>
              <Typography variant="h5" color="muted" className="home-hero-sub">
                Beli & jual buku bekas kuliah dengan harga terbaik, aman, dan terpercaya.
              </Typography>
              <div className="home-hero-search">
                <SearchBar
                  className="light hero"
                  onSearch={handleSearch}
                  placeholder="Cari judul, penulis, atau ISBN..."
                />
              </div>
              <div className="home-hero-stats">
                <div className="home-stat">
                  <span className="home-stat-value">{totalBooks}</span>
                  <span className="home-stat-label">Buku Tersedia</span>
                </div>
              </div>
            </div>

            <div className="home-hero-visual fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="home-hero-card-stack">
                <div className="home-hero-card card-1">
                  <div className="home-hero-card-img" style={{ background: 'linear-gradient(135deg, #1877F2, #0F4A99)' }} />
                </div>
                <div className="home-hero-card card-2">
                  <div className="home-hero-card-img" style={{ background: 'linear-gradient(135deg, #FFB300, #E6A000)' }} />
                </div>
                <div className="home-hero-card card-3">
                  <div className="home-hero-card-img" style={{ background: 'linear-gradient(135deg, #31A24C, #1E7E34)' }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Chips */}
      <section className="home-categories container">
        {searchQuery && (
          <div className="home-search-header">
            <Typography variant="h4" weight="bold">
              Hasil pencarian: "<span className="text-primary">{searchQuery}</span>"
            </Typography>
            <Button variant="ghost" size="sm" onClick={() => { setSearchParams({}); setActiveCategory(''); }}>
              Hapus Filter
            </Button>
          </div>
        )}
        <div className="home-category-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              className={`home-category-chip ${activeCategory === cat.slug ? 'active' : ''}`}
              onClick={() => handleCategory(cat.slug)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Books Grid */}
      <section className="home-books container">
        <div className="home-books-header">
          <Typography variant="h3" weight="bold">
            {isSearching ? 'Hasil Pencarian' : 'Rekomendasi Buku'}
          </Typography>
          {!isSearching && books.length > 0 && (
            <Link to="/?page=2">
              <Button variant="outline" size="sm">Lihat Semua →</Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="home-loading">
            <Spinner size="lg" />
          </div>
        ) : books.length > 0 ? (
          <div className="book-grid">
            {books.map((book, i) => (
              <div key={book.id} className="fade-in-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <ProductCard book={book} />
              </div>
            ))}
          </div>
        ) : (
          <div className="home-empty">
            <div className="home-empty-icon">📚</div>
            <Typography variant="h5" weight="bold" className="mb-2">
              {isSearching ? 'Buku tidak ditemukan' : 'Belum ada buku'}
            </Typography>
            <Typography color="muted">
              {isSearching
                ? 'Coba kata kunci lain atau hapus filter kategori.'
                : 'Belum ada buku yang tersedia saat ini. Cek lagi nanti!'}
            </Typography>
            {isSearching && (
              <Button
                variant="primary"
                size="md"
                className="mt-4"
                onClick={() => { setSearchParams({}); setActiveCategory(''); }}
              >
                Lihat Semua Buku
              </Button>
            )}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      {!isSearching && (
        <section className="home-cta container">
          <div className="home-cta-inner">
            <div>
              <Typography variant="h3" weight="bold" color="light">
                Punya buku bekas yang ingin dijual?
              </Typography>
              <Typography color="light" className="mt-2" style={{ opacity: 0.8 }}>
                Daftar sebagai penjual dan mulai jual buku kuliahmu sekarang.
              </Typography>
            </div>
            <Link to="/register">
              <Button variant="secondary" size="lg">Mulai Jual Sekarang</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
