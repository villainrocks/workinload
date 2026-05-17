/* This code fixed By Tg:@ImxCodex */
import { randomUUID } from 'crypto';

class MediaStoreService {
  constructor() {
    this.items = new Map();
    this.ttlMs = 30 * 60 * 1000;
    this.maxItems = 100; // Limit memory usage
  }

  put(buffer, mimeType = 'image/png') {
    // If store is full, remove oldest items
    if (this.items.size >= this.maxItems) {
      const oldestId = this.items.keys().next().value;
      this.items.delete(oldestId);
    }

    const id = randomUUID();
    this.items.set(id, {
      buffer,
      mimeType,
      createdAt: Date.now(),
    });
    return id;
  }

  get(id) {
    const item = this.items.get(id);
    if (!item) {
      return null;
    }
    if (Date.now() - item.createdAt > this.ttlMs) {
      this.items.delete(id);
      return null;
    }
    return item;
  }

  resolveMediaPath(mediaPath) {
    const raw = String(mediaPath || '');
    const patterns = [
      /^memory:\/\/(.+)$/,
      /\/generated\/([^/?#]+)/,
      /generated\/([^/?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  cleanup() {
    const now = Date.now();
    for (const [id, item] of this.items.entries()) {
      if (now - item.createdAt > this.ttlMs) {
        this.items.delete(id);
      }
    }
  }
}

export const mediaStoreService = new MediaStoreService();
