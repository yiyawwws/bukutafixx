import api from './api';

export const payService = {
  // Get available payment methods from Pakasir
  getMethods: async () => {
    const res = await api.get('/pay/methods');
    return res.data;
  },

  // Create a Pakasir payment for an existing order
  // Body: { order_id, payment_method, redirect_url? }
  createPayment: async (data) => {
    const res = await api.post('/pay/create', data);
    return res.data;
  },

  // Check & sync payment status from Pakasir
  checkStatus: async (orderId) => {
    const res = await api.get(`/pay/status/${orderId}`);
    return res.data;
  },

  // Cancel a pending payment
  cancelPayment: async (orderId) => {
    const res = await api.post(`/pay/cancel/${orderId}`);
    return res.data;
  },
};
