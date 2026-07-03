// Migrated: proxy to local Worker `/api/functions` endpoint
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch('http://127.0.0.1:8787/api/functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'cancelShiftSwap', payload: body })
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});