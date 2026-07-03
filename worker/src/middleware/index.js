/**
 * ============================================
 * MIDDLEWARE FUNCTIONS
 * ============================================
 */

import { verifyJWT } from '../lib/auth.js';

/**
 * CORS Middleware
 * Handles Cross-Origin requests
 */
export function corsMiddleware(request, env, ctx, next) {
  const allowedOrigins = [
    'https://app-pis.pages.dev',
    'https://app-pis-staging.pages.dev',
    'https://base44-app-5pg.pages.dev',  // Current Pages project
    'http://localhost:5173',      // Vite dev
    'http://localhost:8787',       // Wrangler dev
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8787',
  ];

  const origin = request.headers.get('Origin') || '';
  let normalizedOrigin = origin.trim();
  try {
    const url = new URL(origin);
    normalizedOrigin = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch (err) {
    // Ignore invalid Origin value and keep raw origin for logging.
  }

  const allowedOrigin = allowedOrigins.find((allowed) => allowed === origin || allowed === normalizedOrigin);

  if (origin && !allowedOrigin) {
    console.warn('CORS origin denied:', origin, 'normalized:', normalizedOrigin);
  }

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://app-pis.pages.dev',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS, PUT',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers 
    });
  }

  // Attach headers to request for later use
  request.corsHeaders = headers;
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticateUser(request, env, ctx) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ 
      error: 'Authorization header missing or invalid',
      code: 'NO_AUTH_HEADER'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    const decoded = verifyJWT(token, env.JWT_SECRET);
    request.user = decoded;
    // Continue to next handler
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Error Handler
 * Catches and formats errors
 */
export function errorHandler(error) {
  console.error('Unhandled error:', error);

  return new Response(JSON.stringify({
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Request Logging Middleware
 * Logs all incoming requests
 */
export function loggingMiddleware(request, env, ctx) {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  console.log(`[${new Date().toISOString()}] ${method} ${path}`);
}
