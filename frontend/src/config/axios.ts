import axios from 'axios';

// Determine the API base URL based on environment
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    // In production, use the same origin
    return window.location.origin;
  } else {
    // In development, Vite will proxy /api requests to the backend via vite.config.ts
    // So we can just use relative paths
    return '';
  }
};

const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL || 'Using proxied paths (relative)');

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 30000,
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
    console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}:`, response.data);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export default axiosInstance;
export { API_BASE_URL };
