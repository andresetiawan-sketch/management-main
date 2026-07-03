// Migrated: proxy to local Worker `/api/functions` endpoint

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch('http://127.0.0.1:8787/api/functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'checkOverdueReports', payload: body })
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
Mohon segera ditindaklanjuti.

Sistem Manajemen PIS
        `.trim()
      }).catch(() => null)
    );

    await Promise.all(emailPromises);

    // Mark as notified
    await Promise.all(
      overdue.map(r => base44.asServiceRole.entities.TenantReport.update(r.id, { notified_24h: true }))
    );

    return Response.json({
      message: `Notified ${targets.filter(t => t.email).length} managers about ${overdue.length} overdue reports`,
      overdue: overdue.length,
      notified: targets.filter(t => t.email).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});