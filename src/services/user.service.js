/* This code fixed By Tg:@ImxCodex */
import api from '../api/axios';

const API_URL = '/admin';

export const userService = {
  getAll: async () => {
    const response = await api.get(`${API_URL}/users`);
    return response;
  },
  create: async (userData) => {
    const response = await api.post(`${API_URL}/users`, userData);
    return response;
  },
  delete: async (id) => {
    const response = await api.delete(`${API_URL}/users/${id}`);
    return response;
  },
  getStats: async () => {
    const response = await api.get(`${API_URL}/stats`);
    return response;
  }
};
