import api from './api';

export const disputeService = {
  /** POST /api/dispute/report — buyer submits a complaint with unboxing video */
  reportDispute: async (order_id, reason, description = '', videoFile) => {
    const formData = new FormData();
    formData.append('order_id', order_id);
    formData.append('reason', reason);
    if (description) formData.append('description', description);
    if (videoFile) formData.append('unboxing_video', videoFile);
    const response = await api.post('/dispute/report', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** GET /api/dispute/:id — get a single dispute detail */
  getDispute: async (id) => {
    const response = await api.get(`/dispute/${id}`);
    return response.data;
  },

  /** GET /api/dispute/list — buyer's own disputes (admin-gated on backend, so used only by admin) */
  getMyDisputes: async () => {
    const response = await api.get('/dispute/list');
    return response.data;
  },
};
