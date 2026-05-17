/* This code fixed By Tg:@ImxCodex */
const MAX_ENTRIES = 500;
const entries = [];

const normalizeMeta = (meta) => {
  try {
    return JSON.parse(JSON.stringify(meta, (_key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return `[Buffer ${value.length} bytes]`;
      }
      return value;
    }));
  } catch {
    return { value: String(meta) };
  }
};

const addEntry = (level, message, meta = {}) => {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    level,
    message: String(message),
    meta: normalizeMeta(meta),
  };

  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  return entry;
};

export const logger = {
  info(message, meta = {}) {
    addEntry('info', message, meta);
    console.log(`[INFO] ${message}`, meta);
  },
  warn(message, meta = {}) {
    addEntry('warn', message, meta);
    console.warn(`[WARN] ${message}`, meta);
  },
  error(message, meta = {}) {
    addEntry('error', message, meta);
    console.error(`[ERROR] ${message}`, meta);
  },
  entries(limit = 200) {
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), MAX_ENTRIES);
    return entries.slice(0, safeLimit);
  },
};
