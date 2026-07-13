import axios from 'axios';

const api = axios.create({
  baseURL: 'https://humvee-pawing-coastline.ngrok-free.dev/api',
  timeout: 30000, // 30 detik timeout untuk mengakomodasi upload file ke Cloudinary
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

// Add a request interceptor to append the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle global errors (e.g., token expired)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if unauthorized
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const viewSecureFile = async (url) => {
  if (!url) return;
  
  // If it is a Cloudinary URL, open directly
  if (url.startsWith('http') && url.includes('cloudinary.com')) {
    window.open(url, '_blank');
    return;
  }
  
  try {
    let cleanUrl = url;
    if (cleanUrl.startsWith('/api')) {
      cleanUrl = cleanUrl.replace(/^\/api/, '');
    }
    const res = await api.get(cleanUrl, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('Failed to view secure file:', err);
    // Fallback: try opening directly via backend url
    const backendUrl = api.defaults.baseURL.replace(/\/api$/, '');
    const absoluteUrl = url.startsWith('http') ? url : `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    window.open(absoluteUrl, '_blank');
  }
};

export default api;
