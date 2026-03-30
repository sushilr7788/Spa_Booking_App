import axios from 'axios';
import { getToken } from '../context/AuthContext';
import { logger } from '../utils/logger';
import { getApiErrorMessage } from '../utils/apiError';

const BASE_URL = 'https://dev.natureland.hipster-virtual.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  logger.info('API request', {
    method: config.method,
    url: `${config.baseURL}${config.url}`,
  });
  return config;
}, (error) => {
  logger.error('API request setup failed', error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiMessage = getApiErrorMessage(error, error.message);
    logger.error('API response error', {
      status: error.response?.status,
      message: apiMessage,
      url: error.config?.url,
      data: error.response?.data,
    });
    error.message = apiMessage;
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
