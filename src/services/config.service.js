/* This code fixed By Tg:@ImxCodex */
import api from '../api/axios';

const API_URL = '/config';

export const configService = {
  async getAccountConfig(accountId) {
    const response = await api.get(`${API_URL}/${accountId}`);
    return response;
  },

  async saveAccountConfig(accountId, targets, defaults) {
    const response = await api.post(`${API_URL}/${accountId}`, { targets, defaults });
    return response;
  }
};
