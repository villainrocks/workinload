/* This code fixed By Tg:@ImxCodex */
import api from '../api/axios';

/**
 * Telegram account lifecycle:
 *
 *  1. POST /telegram/connect  { phone }
 *       → returns { session_id, message }  (OTP sent to Telegram app)
 *
 *  2. POST /telegram/verify   { session_id, code, phone, password? }
 *       → returns { account }              (account is now active)
 *
 *  3. GET  /telegram/accounts
 *       → returns { accounts: Account[] }
 *
 *  4. DELETE /telegram/accounts/:id
 *       → removes account + session from server
 *
 *  5. PATCH /telegram/accounts/:id/toggle
 *       → toggles active/inactive
 */
export const telegramService = {
  /** Step 1 — send OTP to Telegram number */
  connect: (phone) =>
    api.post('/telegram/connect', { phone }),

  /** Step 2 — submit OTP code */
  verify: (payload) =>
    api.post('/telegram/verify', payload),
  // payload: { session_id, code, phone, password? }

  /** Fetch all connected accounts */
  getAccounts: () =>
    api.get('/telegram/accounts'),

  /** Hard-delete an account */
  deleteAccount: (id) =>
    api.delete(`/telegram/accounts/${id}`),

  /** Toggle active / inactive */
  toggleAccount: (id) =>
    api.patch(`/telegram/accounts/${id}/toggle`),

  /** Re-send OTP to same number */
  resendOtp: (phone) =>
    api.post('/telegram/resend', { phone }),

  /** Broadcast media/text to multiple accounts/groups */
  broadcast: (payload) =>
    api.post('/telegram/broadcast', payload),

  /** Update account config (bank number, drop targets) */
  updateAccountConfig: (id, payload) =>
    api.put(`/telegram/accounts/${id}`, payload),
};
