import axios from 'axios' ;

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

apiClient.interceptors.request.use((config) => {
    console.log(import.meta.env.VITE_API_URL)
    console.log(config)
    const token = localStorage.getItem('admin_token');
    console.log('Interceptor running, token:', token);
    if(token) {
        config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config
})
// import axios from 'axios';

// export const apiClient = axios.create({
//   baseURL: import.meta.env.VITE_API_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// apiClient.interceptors.request.use((config) => {
//   const token = localStorage.getItem('admin_token');

//   console.log('Interceptor running');
//   console.log('Token:', token);

//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   console.log('Config:', config);

//   return config;
// });