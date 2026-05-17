/* This code fixed By Tg:@ImxCodex */
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, KEY_LENGTH).toString('hex');
  return `${HASH_PREFIX}$${salt}$${hash}`;
};

export const verifyPassword = (password, storedPassword) => {
  const stored = String(storedPassword || '');
  const [prefix, salt, hash] = stored.split('$');

  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return stored === String(password);
  }

  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(String(password), salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const isHashedPassword = (storedPassword) => (
  String(storedPassword || '').startsWith(`${HASH_PREFIX}$`)
);
