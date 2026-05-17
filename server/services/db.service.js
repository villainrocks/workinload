/* This code fixed By Tg:@ImxCodex */
import { supabaseService } from './supabase.service.js';
import { logger } from '../utils/logger.js';

export const dbService = {
  async getAccountConfig(ownerId, accountId) {
    try {
      const data = await supabaseService.get('account_configs', { 
        user_id: ownerId, 
        account_id: accountId 
      });
      
      if (data && data.length > 0) {
        const row = data[0];
        return {
          ...row,
          targets: typeof row.targets === 'string' ? JSON.parse(row.targets) : (row.targets || []),
          defaults: typeof row.defaults === 'string' ? JSON.parse(row.defaults) : (row.defaults || {})
        };
      }
      return null;
    } catch (error) {
      logger.error('Failed to get account config from Supabase', { userId: ownerId, accountId, error: error.message });
      throw error;
    }
  },

  async saveAccountConfig(userId, accountId, targets, defaults) {
    try {
      const data = {
        user_id: userId,
        account_id: accountId,
        targets: targets, // Supabase handles JSONB
        defaults: defaults,
        updated_at: new Date().toISOString()
      };
      
      await supabaseService.upsert('account_configs', data, 'user_id,account_id');
      return { success: true };
    } catch (error) {
      logger.error('Failed to save account config to Supabase', { userId, accountId, error: error.message });
      throw error;
    }
  }
};
