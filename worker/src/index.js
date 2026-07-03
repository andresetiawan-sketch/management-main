/**
 * ============================================
 * CLOUDFLARE WORKER ENTRY POINT
 * APP-PIS API BACKEND
 * ============================================
 * 
 * This is the main worker that handles all API requests
 */

import { Router } from 'itty-router';

// Import middleware
import { authenticateUser, corsMiddleware, errorHandler } from './middleware/index.js';

// Import handlers
import { handleLogin, handleLogout, getCurrentUser } from './handlers/auth.js';
import { handleFunctionInvoke } from './handlers/functions.js';
import { handleUpload } from './handlers/uploads.js';
import { 
  listEmployees, 
  getEmployee, 
  getEmployeeByNik, 
  createEmployee, 
  updateEmployee,
  deleteEmployee 
} from './handlers/employees.js';

// Initialize router
const router = Router();

// ============== MIDDLEWARE ==============
router.all('*', corsMiddleware);

// ============== HEALTH CHECK ==============
router.get('/health', () => new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
}));

// ============== AUTHENTICATION ==============
router.post('/api/auth/login', handleLogin);
router.post('/api/auth/logout', authenticateUser, handleLogout);
router.get('/api/auth/me', authenticateUser, getCurrentUser);

// ============== FUNCTION COMPATIBILITY ==============
router.post('/api/functions', handleFunctionInvoke);

// ============== UPLOADS ==============
router.post('/api/uploads', handleUpload);

// ============== EMPLOYEES ==============
router.get('/api/employees', authenticateUser, listEmployees);
router.get('/api/employees/:id', authenticateUser, getEmployee);
router.get('/api/employees/nik/:nik', authenticateUser, getEmployeeByNik);
router.post('/api/employees', authenticateUser, createEmployee);
router.patch('/api/employees/:id', authenticateUser, updateEmployee);
router.delete('/api/employees/:id', authenticateUser, deleteEmployee);

// ============== 404 HANDLER ==============
router.all('*', () => new Response(JSON.stringify({ error: 'Not Found' }), { 
  status: 404, 
  headers: { 'Content-Type': 'application/json' } 
}));

// ============== SCHEDULED TASK (Cron) ==============
export async function scheduled(event, env, ctx) {
  console.log('Running scheduled task at:', new Date().toISOString());

  try {
    // Example: Check overdue reports
    if (!env.DB) {
      console.log('No database binding available');
      return;
    }

    const db = env.DB;
    const overdue = await db
      .prepare('SELECT COUNT(*) as count FROM reports WHERE status = ? AND due_date < ?')
      .bind('pending', new Date().toISOString())
      .first();

    console.log(`Found ${overdue.count} overdue reports`);

    // You can add notification logic here
    // Example: Send email alerts, update statuses, etc.

  } catch (error) {
    console.error('Scheduled task error:', error);
  }
}

// ============== MAIN EXPORT ==============
export default {
  fetch: async (request, env, ctx) => {
    // Attach environment to request for use in handlers
    request.env = env;
    request.ctx = ctx;

    const response = await router.handle(request, env, ctx).catch(errorHandler);

    if (request.corsHeaders && response instanceof Response) {
      for (const [headerName, headerValue] of Object.entries(request.corsHeaders)) {
        response.headers.set(headerName, headerValue);
      }
    }

    return response;
  },
  scheduled: scheduled,
};
