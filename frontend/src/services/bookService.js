import api from './api';

export const bookService = {
  // GET /api/books — dengan filter, pagination, cover_url dari Cloudinary
  getAll: async (params) => {
    const response = await api.get('/books', { params });
    return response.data;
  },

  // Alias untuk kompatibilitas — sekarang menggunakan /books utama
  // /books/list tidak memiliki JOIN yang lengkap (tidak ada cover_url, category_name, dll.)
  getAvailable: async (params = {}) => {
    const response = await api.get('/books', {
      params: { ...params, page: 1, limit: 20 }
    });
    return response.data;
  },

  // GET /api/books/seller-list — khusus untuk seller melihat bukunya sendiri
  getSellerBooks: async (params = {}) => {
    const response = await api.get('/books/seller-list', { params });
    return response.data;
  },

  // GET /api/books/:id — detail buku dengan images array
  getById: async (id) => {
    const response = await api.get(`/books/${id}`);
    return response.data;
  },

  // GET /api/books/:id/seller-contact
  getSellerContact: async (bookId) => {
    const response = await api.get(`/books/${bookId}/seller-contact`);
    return response.data;
  },

  // POST /api/books — tambah buku (seller, multipart)
  addBook: async (formData) => {
    const response = await api.post('/books', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // PUT /api/books/:id — update buku
  updateBook: async (id, formData) => {
    const response = await api.put(`/books/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // DELETE /api/books/:id
  deleteBook: async (id) => {
    const response = await api.delete(`/books/${id}`);
    return response.data;
  },

  // GET /api/books/:bookId/reviews
  getReviews: async (bookId) => {
    const response = await api.get(`/books/${bookId}/reviews`);
    return response.data;
  },

  // GET /api/books?search=... — pencarian buku
  search: async (query, params = {}) => {
    const response = await api.get('/books', {
      params: { search: query, ...params }
    });
    return response.data;
  },

  // GET /api/books?category=slug
  getByCategory: async (slug, params = {}) => {
    const response = await api.get('/books', {
      params: { category: slug, ...params }
    });
    return response.data;
  }
};
