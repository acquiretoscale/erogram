import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

const ACCESS = new Set(['demopublisher', 'support@erogram.biz']);
const PASS = 'Agentpass';

export function matchPublisherLogin(access: string, password: string) {
  const id = (access || '').trim().toLowerCase();
  const pass = (password || '').trim();
  return ACCESS.has(id) && pass.toLowerCase() === PASS.toLowerCase();
}

export function signPublisherToken() {
  return jwt.sign(
    { publisher: true, username: 'Demopublisher' },
    JWT_SECRET,
    { expiresIn: '30d' },
  );
}

export function isPublisherToken(token: string) {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { publisher?: boolean };
    return decoded.publisher === true;
  } catch {
    return false;
  }
}
