/* This code fixed By Tg:@ImxCodex */
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

if (!config.supabase?.url || !config.supabase?.key) {
  logger.warn('Supabase URL or Key not found in config. Database persistence may fail.');
}

export const supabase = createClient(
  config.supabase?.url || '',
  config.supabase?.key || '',
  {
    realtime: {
      transport: ws,
    },
  }
);

export const supabaseService = {
  async get(table, query = {}) {
    let request = supabase.from(table).select('*');
    
    for (const [key, value] of Object.entries(query)) {
      request = request.eq(key, value);
    }

    const { data, error } = await request;
    if (error) {
      logger.error(`Supabase GET error [${table}]:`, error);
      throw error;
    }
    return data;
  },

  async upsert(table, data, onConflict = 'id') {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data, { onConflict });

    if (error) {
      logger.error(`Supabase UPSERT error [${table}]:`, error);
      throw error;
    }
    return result;
  },

  async delete(table, query = {}) {
    let request = supabase.from(table).delete();
    
    for (const [key, value] of Object.entries(query)) {
      request = request.eq(key, value);
    }

    const { error } = await request;
    if (error) {
      logger.error(`Supabase DELETE error [${table}]:`, error);
      throw error;
    }
    return true;
  }
};
