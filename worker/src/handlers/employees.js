/**
 * ============================================
 * EMPLOYEE HANDLER
 * Replaces: base44/functions/getEmployeeByNik + CRUD operations
 * ============================================
 */

import { getDB } from '../lib/db.js';

/**
 * List all employees with filters
 * GET /api/employees?area_tugas=X&role=Y&limit=100&sort=-created_date
 */
export async function listEmployees(request, env) {
  try {
    const db = getDB(env);
    const url = new URL(request.url);
    
    // Parse query parameters
    const area_tugas = url.searchParams.get('area_tugas');
    const role = url.searchParams.get('role');
    const status_aktif = url.searchParams.get('status_aktif');
    const limit = parseInt(url.searchParams.get('limit') || '1000');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort = url.searchParams.get('sort') || '-created_at';

    // Build dynamic WHERE clause
    let where = [];
    let params = [];

    if (area_tugas) {
      where.push('area_tugas = ?');
      params.push(area_tugas);
    }
    if (role) {
      where.push('role = ?');
      params.push(role);
    }
    if (status_aktif !== null) {
      where.push('status_aktif = ?');
      params.push(status_aktif === 'true' ? 1 : 0);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';

    const query = `
      SELECT * FROM employees 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const employees = await db.prepare(query).bind(...params).all();

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM employees ${whereClause}`;
    const countResult = await db.prepare(countQuery).bind(...params.slice(0, -2)).first();

    return new Response(JSON.stringify({
      success: true,
      data: employees.results || [],
      total: countResult.total,
      limit,
      offset,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('List employees error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch employees' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get single employee by ID
 * GET /api/employees/:id
 */
export async function getEmployee(request, env) {
  try {
    const db = getDB(env);
    const { id } = request.params;

    const employee = await db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .bind(id)
      .first();

    if (!employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: employee,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get employee error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get employee by NIK (Replaces Base44 getEmployeeByNik function)
 * GET /api/employees/nik/:nik
 */
export async function getEmployeeByNik(request, env) {
  try {
    const db = getDB(env);
    const { nik } = request.params;

    if (!nik) {
      return new Response(JSON.stringify({ error: 'NIK parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const employee = await db
      .prepare('SELECT * FROM employees WHERE nik_karyawan = ?')
      .bind(nik)
      .first();

    if (!employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: employee,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get employee by NIK error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Create new employee
 * POST /api/employees
 */
export async function createEmployee(request, env) {
  try {
    const db = getDB(env);
    const data = await request.json();
    const { nik_karyawan, nama_lengkap, jabatan, role = 'Staff' } = data;

    // Validate required fields
    if (!nik_karyawan || !nama_lengkap) {
      return new Response(JSON.stringify({ error: 'NIK dan nama lengkap wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if NIK already exists
    const existing = await db
      .prepare('SELECT id FROM employees WHERE nik_karyawan = ?')
      .bind(nik_karyawan)
      .first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'NIK sudah terdaftar' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await db.prepare(`
      INSERT INTO employees (
        id, nik_karyawan, nama_lengkap, jabatan, role, 
        area_tugas, entity_pt, regu, branch, status_aktif,
        email, no_telepon, alamat, password_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, nik_karyawan, nama_lengkap, jabatan || null, role,
      data.area_tugas || null, data.entity_pt || null, data.regu || null,
      data.branch || null, 1,
      data.email || null, data.no_telepon || null, data.alamat || null,
      '$2b$10$' + btoa(nik_karyawan), // Simple placeholder (use bcrypt in production)
      now, now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      data: { id, nik_karyawan, nama_lengkap, jabatan, role },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create employee error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Update employee
 * PATCH /api/employees/:id
 */
export async function updateEmployee(request, env) {
  try {
    const db = getDB(env);
    const { id } = request.params;
    const data = await request.json();

    // Check if employee exists
    const existing = await db
      .prepare('SELECT id FROM employees WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const updateFields = [];
    const updateValues = [];

    // Only update provided fields
    const allowedFields = [
      'nama_lengkap', 'email', 'jabatan', 'role', 'area_tugas',
      'entity_pt', 'regu', 'branch', 'status_aktif', 'no_telepon',
      'alamat', 'tanggal_lahir', 'foto'
    ];

    allowedFields.forEach(field => {
      if (field in data) {
        updateFields.push(`${field} = ?`);
        updateValues.push(data[field]);
      }
    });

    if (updateFields.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(id);

    await db.prepare(`
      UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?
    `).bind(...updateValues).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Employee updated successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Update employee error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Delete employee
 * DELETE /api/employees/:id
 */
export async function deleteEmployee(request, env) {
  try {
    const db = getDB(env);
    const { id } = request.params;
    const userId = request.user?.id;

    // Check if employee exists
    const existing = await db
      .prepare('SELECT id FROM employees WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Soft delete: mark as inactive instead of actually deleting
    await db.prepare(
      'UPDATE employees SET status_aktif = 0, updated_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), id).run();

    // Log deletion
    try {
      await db.prepare(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).bind(userId, 'DELETE', 'employee', id, new Date().toISOString()).run();
    } catch (err) {
      console.warn('Failed to log deletion:', err);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Employee deleted successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
