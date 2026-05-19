import api from './api';

export const reviewService = {
  submitOrderReview: async (orderId, rating, comment) => {
    const response = await api.post(`/reviews/order/${orderId}`, { rating, comment });
    return response.data;
  },

  getOrderReview: async (orderId) => {
    const response = await api.get(`/reviews/order/${orderId}`);
    return response.data;
  },

  getSellerReviews: async () => {
    const response = await api.get('/reviews/seller');
    return response.data;
  }
};
