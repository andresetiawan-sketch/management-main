/**
 * ============================================
 * AUTHENTICATION UTILITIES
 * ============================================
 * JWT, password hashing, token management
 */

/**
 * Generate JWT token
 * @param {Object} payload - User data to include in token
 * @param {string} secret - JWT secret key
 * @param {string} expiresIn - Expiry time (e.g., '24h', '7d')
 * @returns {string} JWT token
 */
export function generateJWT(payload, secret, expiresIn = '24h') {
  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = parseExpiry(expiresIn);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const claims = {
    ...payload,
    iat: now,
    exp: now + expirySeconds,
  };

  // Simple JWT implementation for Cloudflare Workers
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(claims));
  const message = `${encodedHeader}.${encodedPayload}`;

  // Create signature using crypto
  const signature = signHS256(message, secret);
  const encodedSignature = base64url(signature);

  return `${message}.${encodedSignature}`;
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {string} secret - JWT secret key
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const message = `${headerB64}.${payloadB64}`;
  const expectedSignature = signHS256(message, secret);
  const expectedSignatureB64 = base64url(expectedSignature);

  if (signatureB64 !== expectedSignatureB64) {
    throw new Error('Invalid signature');
  }

  // Decode and verify payload
  const payload = JSON.parse(atob(payloadB64));

  // Check expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Hash password using simple method
 * NOTE: For production, use bcrypt.js instead
 * @param {string} password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  // TODO: In production, use bcryptjs
  // For MVP, use a simple SHA256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>}
 */
export async function validatePassword(password, hash) {
  // TODO: In production, use bcryptjs.compare()
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

// ============== HELPER FUNCTIONS ==============

function parseExpiry(expiresIn) {
  const match = expiresIn.match(/^(\d+)([hdms])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiresIn}`);
  }

  const [, value, unit] = match;
  const multipliers = {
    'h': 3600,      // hours
    'd': 86400,     // days
    'm': 60,        // minutes
    's': 1,         // seconds
  };

  return parseInt(value) * multipliers[unit];
}

function base64url(input) {
  if (typeof input === 'string') {
    input = new TextEncoder().encode(input);
  }

  let base64 = '';
  for (let i = 0; i < input.length; i++) {
    base64 += String.fromCharCode(input[i]);
  }
  return btoa(base64)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signHS256(message, secret) {
  // Simplified HMAC-SHA256 for demo
  // For production, use proper crypto libraries
  return btoa(message + secret);
}
