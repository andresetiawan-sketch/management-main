// Migrated: proxy to local Worker `/api/functions` endpoint

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch('http://127.0.0.1:8787/api/functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'weeklyAreaReport', payload: body })
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
      doc.rect(0, ph - 10, pw, 10, 'F');
      doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text(`Laporan Mingguan PIS — ${weekLabel} — Hal ${p}/${totalPages}`, pw / 2, ph - 4, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');

    // Send to all managers
    const managers = await client.entities.Employee.filter({ status_aktif: 'Aktif' });
    const targets = managers.filter(e => {
      const r = e.role || e.jabatan || '';
      return ['Master Admin','Supervisor Facility','Chief Security','Admin Pos'].includes(r) && e.email;
    });

    const topArea = perfList[0]?.area || '-';
    const bottomArea = perfList[perfList.length - 1]?.area || '-';

    await Promise.all(targets.map(t =>
      client.integrations.Core.SendEmail({
        to: t.email,
        subject: `📊 Laporan Mingguan Kinerja Area — ${weekLabel}`,
        body: `Yth. ${t.nama_lengkap},\n\nBerikut ringkasan kinerja area mingguan:\n\n📊 Periode: ${weekLabel}\n👥 Total hadir: ${weekAtt.filter(a => a.status === 'Hadir').length}\n🛡️ Total patroli: ${weekPat.length}\n🔧 Tiket baru: ${weekTickets.length}\n\n🏆 Area terbaik: ${topArea} (Skor: ${perfList[0]?.overall || '-'})\n⚠️ Perlu perhatian: ${bottomArea} (Skor: ${perfList[perfList.length-1]?.overall || '-'})\n\nLaporan PDF terlampir secara digital.\nSilakan cek dashboard Performa & Analytics untuk detail lengkap.\n\nSistem PIS`.trim()
      }).catch(() => null)
    ));

    return Response.json({
      success: true,
      message: `Laporan mingguan dikirim ke ${targets.length} manager`,
      period: weekLabel,
      areas: perfList.length,
      topArea,
      bottomArea
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});