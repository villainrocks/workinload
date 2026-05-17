/* This code fixed By Tg:@ImxCodex */
import { AppError } from '../utils/errors.js';
import { config } from '../config.js';

const memoryStore = new Map();

/**
 * Simple in-memory rate limiter middleware
 */
export const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || config.limits.rateLimitWindowMs;
  const max = options.max || config.limits.maxRequestsPerWindow;

  // Cleanup store periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    let record = memoryStore.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      memoryStore.set(ip, record);
      return next();
    }

    record.count++;

    if (record.count > max) {
      return next(AppError.tooManyRequests());
    }

    next();
  };
};
