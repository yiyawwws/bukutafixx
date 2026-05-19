import api from './api';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  register: async (formData) => {
    // formData is expected to be FormData object because of image uploads
    const response = await api.post('/auth/register', formData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  verifyIdentity: async () => {
    const response = await api.post('/auth/verify');
    return response.data;
  },

  switchRole: async (active_role) => {
    // Note: the backend endpoint for switch role is in users.js -> /api/users/switch-role
    const response = await api.put('/users/switch-role', { active_role });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }
};
