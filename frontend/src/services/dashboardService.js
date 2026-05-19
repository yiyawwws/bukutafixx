import api from './api';

export const dashboardService = {
  getAdminStats: async () => {
    const response = await api.get('/dashboard/admin');
    return response.data;
  },
  
  getSellerStats: async () => {
    const response = await api.get('/dashboard/seller');
    return response.data;
  },
  
  getBuyerStats: async () => {
    const response = await api.get('/dashboard/buyer');
    return response.data;
  }
};
