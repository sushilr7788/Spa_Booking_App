import { apiClient } from './client';

export const authApi = {
  login: async (email, password, keyPass) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('key_pass', keyPass);
    const { data } = await apiClient.post('/api/v1/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};

export const therapistsApi = {
  getList: async (params) => {
    const { data } = await apiClient.get('/api/v1/therapists', { params });
    return data;
  },
};

export const bookingsApi = {
  getList: async (params) => {
    const { data } = await apiClient.get('/api/v1/bookings/outlet/booking/list', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await apiClient.get(`/api/v1/bookings/booking-details/${id}`);
    return data;
  },
  create: async (payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
    const { data } = await apiClient.post('/api/v1/bookings/create', formData);
    return data;
  },
  update: async (id, payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
    const { data } = await apiClient.post(`/api/v1/bookings/${id}`, formData);
    return data;
  },
  updateStatus: async (id, status, company = 1, outlet_type = 1) => {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('status', status);
    formData.append('company', company);
    formData.append('panel', 'outlet');
    formData.append('outlet_type', outlet_type);
    const { data } = await apiClient.post('/api/v1/bookings/update/payment-status', formData);
    return data;
  },
  cancel: async (id, company = 1) => {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('company', company);
    formData.append('type', 'normal');
    formData.append('panel', 'outlet');
    const { data } = await apiClient.post('/api/v1/bookings/item/cancel', formData);
    return data;
  },
  delete: async (id) => {
    const { data } = await apiClient.delete(`/api/v1/bookings/destroy/${id}`);
    return data;
  },
};

export const servicesApi = {
  getList: async (params) => {
    const { data } = await apiClient.get('/api/v1/service-category', { params });
    return data;
  },
};

export const usersApi = {
  getList: async (params) => {
    const { data } = await apiClient.get('/api/v1/users', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await apiClient.get(`/api/v1/users/${id}`);
    return data;
  },
  create: async (payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, value);
    });
    const { data } = await apiClient.post('/api/v1/users/create', formData);
    return data;
  },
};

export const roomsApi = {
  getList: async (outletId, params) => {
    const { data } = await apiClient.get(`/api/v1/room-bookings/outlet/${outletId}`, { params });
    return data;
  },
};

export const therapistTimingApi = {
  getList: async (params) => {
    const { data } = await apiClient.get('/api/v1/therapist-timings', { params });
    return data;
  },
};

export const outletTimingApi = {
  getList: async (params) => {
    const { data } = await apiClient.get('/api/v1/outlet-timings', { params });
    return data;
  },
};
