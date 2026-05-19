import api from './api';

export const cartService = {
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },
  addToCart: async (bookId, quantity = 1) => {
    const response = await api.post('/cart', { book_id: bookId, quantity });
    return response.data;
  },
  updateQuantity: async (cartItemId, quantity) => {
    const response = await api.put(`/cart/${cartItemId}`, { quantity });
    return response.data;
  },
  removeItem: async (cartItemId) => {
    const response = await api.delete(`/cart/${cartItemId}`);
    return response.data;
  },
  clearCart: async () => {
    const response = await api.delete('/cart');
    return response.data;
  }
};
