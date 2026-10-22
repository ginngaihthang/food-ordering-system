    import axios from 'axios' ;

    export const apiClient = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    })
    apiClient.interceptors.request.use((config) => {
        const token = localStorage.getItem('admin_token');
        if(token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }
        return config
    })

    apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');

      // Avoid redirect loop if already on login page
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);