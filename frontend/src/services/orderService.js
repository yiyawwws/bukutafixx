import api from './api';

export const orderService = {
  // Ambil semua pesanan (mendukung pagination dan filter status)
  getOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  // Ambil detail pesanan berdasarkan ID
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Buat pesanan baru (checkout)
  createOrder: async (data) => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  // Update status pengiriman / pembayaran pesanan (Seller/Admin)
  updateOrderStatus: async (id, statusData) => {
    const response = await api.put(`/orders/${id}/status`, statusData);
    return response.data;
  },

  // Batalkan pesanan (Buyer/Admin)
  cancelOrder: async (id) => {
    const response = await api.put(`/orders/${id}/cancel`);
    return response.data;
  },

  // ── Shipment ───────────────────────────────────────────────

  // Seller submits shipment proof
  submitShipment: async (orderId, payload) => {
    // Axios automatically sets Content-Type to multipart/form-data when payload is FormData
    const response = await api.post(`/orders/${orderId}/shipment`, payload);
    return response.data;
  },

  // Get shipment info for an order
  getShipment: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/shipment`);
    return response.data;
  },

  // ── Buyer confirm received ────────────────────────────────

  confirmReceived: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/confirm-received`);
    return response.data;
  },

  // ── Complaint ─────────────────────────────────────────────

  // Buyer creates a complaint
  createComplaint: async (orderId, payload) => {
    const response = await api.post(`/orders/${orderId}/complaint`, payload);
    return response.data;
  },

  // Get complaint for an order
  getComplaint: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/complaint`);
    return response.data;
  },

  // Admin: get all complaints
  getAllComplaints: async () => {
    const response = await api.get('/complaints');
    return response.data;
  },

  // Admin: approve refund
  approveComplaint: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/complaint/approve`);
    return response.data;
  },

  // Admin: reject complaint → release funds to seller
  rejectComplaint: async (orderId, adminNote) => {
    const response = await api.post(`/orders/${orderId}/complaint/reject`, { admin_note: adminNote });
    return response.data;
  },

  // ── Campus COD ─────────────────────────────────────────────

  acceptCod: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/cod/accept`);
    return response.data;
  },

  completeCod: async (orderId, handoverCode) => {
    const response = await api.post(`/orders/${orderId}/cod/complete`, { handover_code: handoverCode });
    return response.data;
  },

  cancelCod: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/cod/cancel`);
    return response.data;
  },
};

