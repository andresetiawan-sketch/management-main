import { getDB } from '../lib/db.js';

export async function handleUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';

    if (!file) {
      return new Response(JSON.stringify({ error: 'file field is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const filename = file.name || `upload-${Date.now()}`;
    const key = `${folder}/${crypto.randomUUID()}-${filename}`;

    const arrayBuffer = await file.arrayBuffer();

    // Store in R2
    if (!env.STORAGE) {
      console.warn('No R2 binding STORAGE available; skipping R2 put (dev)');
    } else {
      await env.STORAGE.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });
    }

    // Record in D1 file_uploads
    try {
      const db = getDB(env);
      const id = crypto.randomUUID();
      // Use demo user when no auth provided (dev-friendly)
      const userId = null; // default null
      const effectiveUserId = userId || 'demo-001';
      await db.prepare('INSERT INTO file_uploads (id, user_id, filename, r2_key, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, effectiveUserId, filename, key, file.type || null, arrayBuffer.byteLength, new Date().toISOString()).run();
    } catch (err) {
      console.warn('Failed to record file_uploads entry', err);
    }

    // Dev-friendly file URL
    const file_url = `/r2/${encodeURIComponent(key)}`;

    return new Response(JSON.stringify({ success: true, file_url, key }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
