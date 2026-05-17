/* This code fixed By Tg:@ImxCodex */
import { createHmac, timingSafeEqual } from 'crypto';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const decode = (tokenPart) => {
  return JSON.parse(Buffer.from(tokenPart, 'base64url').toString('utf8'));
};

const getSecret = () => (
  process.env.TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  process.env.DEFAULT_ADMIN_PASSWORD ||
  'nexus-panel-local-token-secret'
);

const sign = (headerPart, payloadPart) => (
  createHmac('sha256', getSecret())
    .update(`${headerPart}.${payloadPart}`)
    .digest('base64url')
);

const assertSignature = (token, expected) => {
  const actualBuffer = Buffer.from(String(token || ''), 'base64url');
  const expectedBuffer = Buffer.from(String(expected || ''), 'base64url');

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature');
  }
};

class TokenService {
  createToken(user) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'admin',
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };
    const headerPart = encode(header);
    const payloadPart = encode(payload);

    return `${headerPart}.${payloadPart}.${sign(headerPart, payloadPart)}`;
  }

  verifyToken(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token');
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    assertSignature(signaturePart, sign(headerPart, payloadPart));

    const payload = decode(parts[1]);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    return payload;
  }
}

export const tokenService = new TokenService();
