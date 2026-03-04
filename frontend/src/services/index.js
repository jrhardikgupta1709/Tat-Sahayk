import api from '../lib/api';

const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000';

const authService = {
  async login(email, password) {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const { data } = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('token', data.access_token);
    const user = await this.getMe();
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async signup(payload) {
    const { data } = await api.post('/auth/signup', payload);
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async updateLocation(latitude, longitude) {
    const { data } = await api.put('/auth/me/location', { latitude, longitude });
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!localStorage.getItem('token');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  officials() {
    return api.get('/auth/officials');
  },
};

const reportService = {
  create:   (body) => api.post('/reports/', body),
  sos:      (body) => api.post('/reports/sos', body),
  list:     (params) => api.get('/reports/', { params }),
  get:      (id) => api.get(`/reports/${id}`),
  stats:    () => api.get('/reports/stats'),
  hotspots: () => api.get('/reports/hotspots'),
  feed:     (params) => api.get('/reports/feed', { params }),
  byZone:   (params) => api.get('/reports/by-zone', { params }),
  verify:   (id, status) =>
    api.patch(`/reports/${id}/verify`, null, { params: { status } }),
};

const zoneService = {
  list:       (params) => api.get('/zones/', { params }),
  get:        (id) => api.get(`/zones/${id}`),
  create:     (body) => api.post('/zones/', body),
  update:     (id, body) => api.patch(`/zones/${id}`, body),
  stats:      (id) => api.get(`/zones/${id}/stats`),
  officials:  (id) => api.get(`/zones/${id}/officials`),
  assign:     (body) => api.post('/zones/assign', body),
  unassign:   (userId) => api.post(`/zones/unassign/${userId}`),
};

const mediaService = {
  async upload(file) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

const notificationService = {
  list:       (params) => api.get('/notifications/', { params }),
  stats:      () => api.get('/notifications/stats'),
  push:       (body) => api.post('/notifications/', body),
  markRead:   (id) => api.post(`/notifications/${id}/read`),
  markAllRead:() => api.post('/notifications/read-all'),
  targetCount:(params) => api.get('/notifications/target-count', { params }),
};

const newsService = {
  list: (params) => api.get('/news/', { params }),
};

const mlService = {
  async analyzeText(text) {
    try {
      const { data } = await fetch(`${ML_URL}/api/v1/analyze/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then((r) => r.json().then((d) => ({ data: d })));
      return data;
    } catch {
      return null;
    }
  },

  async analyzeImage(file) {
    try {
      const form = new FormData();
      form.append('image', file);
      const resp = await fetch(`${ML_URL}/api/v1/analyze/image`, {
        method: 'POST',
        body: form,
      });
      return resp.json();
    } catch {
      return null;
    }
  },

  async health() {
    try {
      const r = await fetch(`${ML_URL}/health`);
      return r.ok;
    } catch {
      return false;
    }
  },
};

export { authService, reportService, mediaService, mlService, zoneService, notificationService, newsService };
