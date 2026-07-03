/**
 * ============================================
 * DATABASE UTILITIES
 * ============================================
 * Handles D1 database operations
 */

export function getDB(env) {
  if (!env.DB) {
    throw new Error('D1 database binding "DB" not found in environment');
  }
  return env.DB;
}

/**
 * Initialize database schema (called once on first deploy)
 */
export async function initializeDatabase(db) {
  try {
    // Create tables if they don't exist
    // (This is typically handled by migrations)
    console.log('Database initialized or already exists');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Helper to execute raw SQL query
 */
export async function executeQuery(db, query, params = []) {
  try {
    return await db.prepare(query).bind(...params).all();
  } catch (error) {
    console.error('Query execution error:', error, { query, params });
    throw error;
  }
}
