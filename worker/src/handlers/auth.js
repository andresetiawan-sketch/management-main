/**
 * ============================================
 * AUTHENTICATION HANDLER
 * Replaces: base44/functions/employeeLogin
 * ============================================
 */

import { generateJWT, validatePassword, hashPassword } from '../lib/auth.js';
import { getDB } from '../lib/db.js';
import { validateInput } from '../lib/validators.js';

/**
 * Handle login request
 * POST /api/auth/login
 */
export async function handleLogin(request, env) {
  try {
    let nik, password;
    
    try {
      const body = await request.json();
      nik = body.nik;
      password = body.password;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate input
    if (!nik || !password) {
      return new Response(JSON.stringify({ error: 'NIK dan password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB(env);

    // Find employee
    const employee = await db
      .prepare('SELECT * FROM employees WHERE nik_karyawan = ? AND status_aktif = 1')
      .bind(nik)
      .first();

    if (!employee) {
      // Log failed login attempt (don't reveal if NIK exists)
      return new Response(JSON.stringify({ error: 'NIK atau password salah' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate password
    const isValid = await validatePassword(password, employee.password_hash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'NIK atau password salah' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate JWT token
    const token = generateJWT(
      { 
        id: employee.id, 
        nik: employee.nik_karyawan, 
        role: employee.role,
        area_tugas: employee.area_tugas 
      },
      env.JWT_SECRET,
      '24h'
    );

    // Log successful login
    try {
      await db.prepare(
        'INSERT INTO audit_logs (user_id, action, timestamp) VALUES (?, ?, ?)'
      ).bind(employee.id, 'LOGIN_SUCCESS', new Date().toISOString()).run();
    } catch (err) {
      console.warn('Failed to log login:', err);
      // Don't fail the login if audit logging fails
    }

    return new Response(JSON.stringify({
      success: true,
      token,
      employee: {
        id: employee.id,
        nik_karyawan: employee.nik_karyawan,
        nama_lengkap: employee.nama_lengkap,
        email: employee.email,
        jabatan: employee.jabatan,
        role: employee.role,
        area_tugas: employee.area_tugas,
        entity_pt: employee.entity_pt,
        foto: employee.foto,
        regu: employee.regu,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle logout request
 * POST /api/auth/logout
 */
export async function handleLogout(request, env) {
  try {
    // Client should discard the token on their side
    // Server doesn't maintain a token blacklist (stateless auth)
    
    const userId = request.user?.id;
    if (userId) {
      const db = getDB(env);
      try {
        await db.prepare(
          'INSERT INTO audit_logs (user_id, action, timestamp) VALUES (?, ?, ?)'
        ).bind(userId, 'LOGOUT', new Date().toISOString()).run();
      } catch (err) {
        console.warn('Failed to log logout:', err);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Logged out successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export async function getCurrentUser(request, env) {
  try {
    const user = request.user;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB(env);
    const fullUser = await db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .bind(user.id)
      .first();

    if (!fullUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: fullUser.id,
        nik_karyawan: fullUser.nik_karyawan,
        nama_lengkap: fullUser.nama_lengkap,
        email: fullUser.email,
        role: fullUser.role,
        area_tugas: fullUser.area_tugas,
        foto: fullUser.foto,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export async function handleResetPassword(request, env) {
  try {
    const { new_password, confirm_password } = await request.json();
    const userId = request.user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!new_password || !confirm_password) {
      return new Response(JSON.stringify({ error: 'Password dan konfirmasi wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (new_password !== confirm_password) {
      return new Response(JSON.stringify({ error: 'Password tidak cocok' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password minimal 6 karakter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB(env);
    const hashedPassword = await hashPassword(new_password);

    await db.prepare(
      'UPDATE employees SET password_hash = ?, updated_at = ? WHERE id = ?'
    ).bind(hashedPassword, new Date().toISOString(), userId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Password berhasil direset' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
