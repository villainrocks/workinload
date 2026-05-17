/* This code fixed By Tg:@ImxCodex */
import api from '../api/axios';

export const templateService = {
  // This endpoint is mounted at the root (/) in backend, 
  // so we go up from /api/v1/
  generate: (payload) => api.post('../../generate', payload),
  
  preview: (payload) => api.post('../../preview', payload),
};
