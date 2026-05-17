/* This code fixed By Tg:@ImxCodex */
import api from '../api/axios';

export const activityService = {
  getLogs: (limit = 200) => api.get('/logs', { params: { limit } }),
};
