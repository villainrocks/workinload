/* This code fixed By Tg:@ImxCodex */
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  telegram: {
    apiId: parseInt(process.env.TG_API_ID || '0', 10),
    apiHash: process.env.TG_API_HASH || '',
  },
  limits: {
    maxImageWidth: 2000,
    maxImageHeight: 4000,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    maxRequestsPerWindow: 100,
    maxAccountsPerAdmin: 15,
    maxAccountsPerUser: 10,
  },
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  },
};
