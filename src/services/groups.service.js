/* This code fixed By Tg:@ImxCodex */
import api from '../api/axios';

/**
 * Groups API service
 *
 * GET  /groups                      → { groups: Group[] }
 * GET  /groups?account_id=:id       → groups filtered by account
 * POST /groups/select               → { group_ids: number[], account_id? }
 * GET  /groups/selected             → { groups: Group[] }  (saved selections)
 * POST /groups/sync/:account_id     → trigger re-fetch from Telegram
 */
export const groupsService = {
  getAll: (accountId, selected) =>
    api.get('/groups', { params: { accountId, selected } }),

  add: (payload) =>
    api.post('/groups', payload),
  // payload: { accountId, chatIdOrUsername }

  toggleSelection: (id, isSelected) =>
    api.put(`/groups/${id}/select`, { isSelected }),

  batchSelect: (payload) =>
    api.post('/groups/select', payload),
  // payload: { ids: string[], isSelected?: boolean }

  sync: (accountId) =>
    api.post('/groups/sync', { accountId }),

  delete: (id) =>
    api.delete(`/groups/${id}`),
};
