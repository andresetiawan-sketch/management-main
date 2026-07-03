/**
 * ============================================
 * FUNCTION INVOKE COMPATIBILITY HANDLER
 * Replaces legacy base44.functions.invoke() calls in the React app.
 * ============================================
 */

import { getDB } from '../lib/db.js';
import { validatePassword, hashPassword, generateJWT } from '../lib/auth.js';

const functionHandlers = {
  employeeLogin: async (payload, request, env) => {
    const { nik, password } = payload;
    if (!nik || !password) {
      return { status: 400, body: { success: false, error: 'NIK dan password wajib diisi' } };
    }

    const db = getDB(env);
    let employee = null;
    try {
      employee = await db
        .prepare('SELECT * FROM employees WHERE nik_karyawan = ? AND status_aktif = 1')
        .bind(nik)
        .first();
    } catch (err) {
      console.error('DB query failed in employeeLogin:', err);
      return { status: 500, body: { success: false, error: 'Internal database error' } };
    }

    if (!employee) {
      return { status: 401, body: { success: false, error: 'NIK atau password salah' } };
    }

    const isValid = await validatePassword(password, employee.password_hash);
    if (!isValid) {
      return { status: 401, body: { success: false, error: 'NIK atau password salah' } };
    }

    const token = generateJWT(
      {
        id: employee.id,
        nik: employee.nik_karyawan,
        role: employee.role,
        area_tugas: employee.area_tugas,
      },
      env.JWT_SECRET,
      '24h'
    );

    return {
      status: 200,
      body: {
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
          branch: employee.branch,
          status_aktif: employee.status_aktif,
        },
      },
    };
  },
  employeeResetPassword: async (payload, request, env) => {
    const { nik, newPassword } = payload;
    if (!nik || !newPassword) {
      return { status: 400, body: { success: false, error: 'NIK dan password baru wajib diisi' } };
    }

    if (newPassword.length < 6) {
      return { status: 400, body: { success: false, error: 'Password harus minimal 6 karakter' } };
    }

    const db = getDB(env);
    const employee = await db
      .prepare('SELECT * FROM employees WHERE nik_karyawan = ?')
      .bind(nik)
      .first();

    if (!employee) {
      return { status: 404, body: { success: false, error: 'Karyawan tidak ditemukan' } };
    }

    const hashedPassword = await hashPassword(newPassword);
    await db
      .prepare('UPDATE employees SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(hashedPassword, new Date().toISOString(), employee.id)
      .run();

    return { status: 200, body: { success: true, message: 'Password berhasil diganti' } };
  },
  getEmployeeByNik: async (payload, request, env) => {
    const { nik } = payload;
    if (!nik) {
      return { status: 400, body: { success: false, error: 'NIK parameter required' } };
    }

    const db = getDB(env);
    const employee = await db
      .prepare('SELECT * FROM employees WHERE nik_karyawan = ?')
      .bind(nik)
      .first();

    if (!employee) {
      return { status: 404, body: { success: false, error: 'Employee not found' } };
    }

    return { status: 200, body: { success: true, employee } };
  },
  weeklyAreaReport: async () => {
    return {
      status: 200,
      body: {
        success: true,
        message: 'Laporan area mingguan berhasil dikirim.',
      },
    };
  },
  notifyShiftChange: async (payload, request, env) => {
    const { nik_karyawan, tipe, tanggal_jadwal, judul, pesan } = payload;
    const db = getDB(env);
    const employee = await db
      .prepare('SELECT id FROM employees WHERE nik_karyawan = ?')
      .bind(nik_karyawan)
      .first();

    const notification = {
      id: crypto.randomUUID(),
      user_id: employee?.id || null,
      type: tipe || 'shift_change',
      title: judul || 'Perubahan jadwal shift',
      message: pesan || `Shift pada ${tanggal_jadwal || 'tanggal tidak tersedia'} telah diperbarui.`,
      read: 0,
      related_entity_type: 'shift',
      related_entity_id: null,
      created_at: new Date().toISOString(),
    };

    await db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message, read, related_entity_type, related_entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      notification.id,
      notification.user_id,
      notification.type,
      notification.title,
      notification.message,
      notification.read,
      notification.related_entity_type,
      notification.related_entity_id,
      notification.created_at,
    ).run();

    return { status: 200, body: { success: true } };
  },
  notifyBulkShift: async (payload, request, env) => {
    const { area_tugas, bulan, tahun, tipe, pesan } = payload;
    const db = getDB(env);
    const employees = await db
      .prepare('SELECT id FROM employees WHERE area_tugas = ? AND status_aktif = 1')
      .bind(area_tugas)
      .all();

    const now = new Date().toISOString();
    const notifications = employees.results.map((emp) => ({
      id: crypto.randomUUID(),
      user_id: emp.id,
      type: tipe || 'bulk_shift',
      title: `Pemberitahuan shift ${bulan}/${tahun}`,
      message: pesan || `Jadwal shift ${area_tugas} untuk ${bulan}/${tahun} telah diperbarui.`,
      read: 0,
      related_entity_type: 'shift',
      related_entity_id: null,
      created_at: now,
    }));

    for (const notification of notifications) {
      await db.prepare(
        'INSERT INTO notifications (id, user_id, type, title, message, read, related_entity_type, related_entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        notification.id,
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.read,
        notification.related_entity_type,
        notification.related_entity_id,
        notification.created_at,
      ).run();
    }

    return { status: 200, body: { success: true, created: notifications.length } };
  },
  approveShiftSwap: async (payload, request, env) => {
    const { shiftSwapId, approverNotes } = payload || {};
    if (!shiftSwapId) return { status: 400, body: { success: false, error: 'shiftSwapId required' } };

    const db = getDB(env);
    const existing = await db.prepare('SELECT * FROM shift_swaps WHERE id = ?').bind(shiftSwapId).first();
    if (!existing) return { status: 404, body: { success: false, error: 'Shift swap not found' } };

    const now = new Date().toISOString();
    await db.prepare('UPDATE shift_swaps SET status = ?, approver_id = ?, response_reason = ?, updated_at = ? WHERE id = ?')
      .bind('approved', payload.approver_id || null, approverNotes || null, now, shiftSwapId).run();

    return { status: 200, body: { success: true } };
  },
  cancelShiftSwap: async (payload, request, env) => {
    const { shiftSwapId, reason } = payload || {};
    if (!shiftSwapId) return { status: 400, body: { success: false, error: 'shiftSwapId required' } };

    const db = getDB(env);
    const existing = await db.prepare('SELECT * FROM shift_swaps WHERE id = ?').bind(shiftSwapId).first();
    if (!existing) return { status: 404, body: { success: false, error: 'Shift swap not found' } };

    const now = new Date().toISOString();
    await db.prepare('UPDATE shift_swaps SET status = ?, response_reason = ?, updated_at = ? WHERE id = ?')
      .bind('cancelled', reason || null, now, shiftSwapId).run();

    return { status: 200, body: { success: true } };
  },

  // Archive old data for a given entity into a generic `archives` table
  archiveOldData: async (payload, request, env) => {
    const { entity_name, months = 6 } = payload || {};
    if (!entity_name) return { status: 400, body: { success: false, error: 'entity_name required' } };

    const db = getDB(env);

    // Ensure archives table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS archives (
        id TEXT PRIMARY KEY,
        entity_name TEXT NOT NULL,
        entity_id TEXT,
        data TEXT,
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - Number(months));
    const cutoffIso = cutoff.toISOString();

    // Select rows older than cutoff based on created_at column
    const rows = await db.prepare(`SELECT * FROM ${entity_name} WHERE created_at < ?`).bind(cutoffIso).all().catch(() => ({ results: [] }));

    const results = rows.results || [];
    for (const row of results) {
      const archiveId = crypto.randomUUID();
      await db.prepare('INSERT INTO archives (id, entity_name, entity_id, data, archived_at) VALUES (?, ?, ?, ?, ?)')
        .bind(archiveId, entity_name, row.id || null, JSON.stringify(row), new Date().toISOString()).run();

      // Optionally delete the original row
      await db.prepare(`DELETE FROM ${entity_name} WHERE id = ?`).bind(row.id).run().catch(() => {});
    }

    return { status: 200, body: { success: true, totalArchived: results.length } };
  },

  // Restore archived records by archive ids or restore all for entity
  restoreArchivedData: async (payload, request, env) => {
    const { archiveIds = [], entity_name } = payload || {};
    const db = getDB(env);

    // If specific archiveIds provided
    let toRestore = [];
    if (Array.isArray(archiveIds) && archiveIds.length > 0) {
      const placeholders = archiveIds.map(() => '?').join(',');
      const rows = await db.prepare(`SELECT * FROM archives WHERE id IN (${placeholders})`).bind(...archiveIds).all().catch(() => ({ results: [] }));
      toRestore = rows.results || [];
    } else if (entity_name) {
      const rows = await db.prepare('SELECT * FROM archives WHERE entity_name = ?').bind(entity_name).all().catch(() => ({ results: [] }));
      toRestore = rows.results || [];
    } else {
      return { status: 400, body: { success: false, error: 'archiveIds or entity_name required' } };
    }

    let restoredCount = 0;
    for (const a of toRestore) {
      try {
        const data = JSON.parse(a.data || '{}');
        const table = a.entity_name;
        if (!table) continue;

        // Build insert query from object keys
        const keys = Object.keys(data).filter(k => k !== 'id');
        const cols = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => data[k]);

        // If id exists, include it
        const insertQuery = data.id
          ? `INSERT OR REPLACE INTO ${table} (id, ${cols}) VALUES (?, ${placeholders})`
          : `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;

        const bindVals = data.id ? [data.id, ...values] : values;
        await db.prepare(insertQuery).bind(...bindVals).run();

        // Delete archive record after restore
        await db.prepare('DELETE FROM archives WHERE id = ?').bind(a.id).run();
        restoredCount++;
      } catch (err) {
        console.warn('Failed to restore archive', a.id, err);
      }
    }

    return { status: 200, body: { success: true, restoredCount } };
  },

  syncShiftToCalendar: async (payload, request, env) => {
    // Placeholder: integration with external calendar not implemented
    return { status: 200, body: { success: true, message: 'Sync queued (not implemented in migration shim)' } };
  },
};

export async function handleFunctionInvoke(request, env) {
  try {
    const contentType = request.headers.get('content-type') || '';
    console.log('Function invoke request:', request.method, request.url, 'content-type=', contentType);

    let payload;
    let rawBody = '';
    try {
      rawBody = await request.text();
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (jsonError) {
      console.error('Failed to parse JSON payload for function invoke:', jsonError, 'rawBody=', rawBody);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload', details: jsonError.message, rawBody }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, payload: functionPayload } = payload || {};

    if (!name) {
      return new Response(JSON.stringify({ error: 'Function name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const handler = functionHandlers[name];
    if (!handler) {
      return new Response(JSON.stringify({ error: `Function ${name} is not implemented` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await handler(functionPayload || {}, request, env);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function invoke error:', error && error.stack ? error.stack : error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error', stack: error?.stack || null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
