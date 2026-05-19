import api from './api';

export const adminService = {
  // Users
  getUsers: async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  verifyUserKtm: async (id) => {
    const response = await api.put(`/users/${id}/verify`);
    return response.data;
  },
  banUser: async (id) => {
    const response = await api.put(`/users/${id}/ban`);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Books
  getBooks: async (params) => {
    const response = await api.get('/books/admin-list', { params });
    return response.data;
  },
  approveBook: async (id, is_approved) => {
    // PUT /api/books/:id can update is_approved if user is admin
    const response = await api.put(`/books/${id}`, { is_approved });
    return response.data;
  },
  deleteBook: async (id) => {
    const response = await api.delete(`/books/${id}`);
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  createCategory: async (data) => {
    const response = await api.post('/categories', data);
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Disputes
  getDisputes: async (params) => {
    const response = await api.get('/dispute/list', { params });
    return response.data;
  },
  markDisputeReview: async (id) => {
    const response = await api.patch(`/dispute/${id}/review`);
    return response.data;
  },
  resolveDispute: async (id, data) => {
    // data: { decision: 'refund' | 'release', admin_notes }
    const response = await api.put(`/dispute/${id}/resolve`, data);
    return response.data;
  }
};
