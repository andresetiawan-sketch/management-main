/**
 * Entity Automation: dipanggil saat ShiftSchedule dibuat atau diperbarui.
 * Mencari karyawan di area+regu yang terdampak dan mengirim notifikasi.
 */
// Migrated: proxy to local Worker `/api/functions` endpoint

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch('http://127.0.0.1:8787/api/functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'autoNotifyShiftCreated', payload: body })
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

    // Cari semua karyawan aktif di area+regu tersebut
    const employees = await base44.asServiceRole.entities.Employee.filter({
      area_tugas,
      regu,
      status_aktif: 'Aktif'
    }, 'nama_lengkap', 100);

    if (employees.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    const tipe = isUpdate ? 'Jadwal Berubah' : 'Jadwal Baru';
    const pesan = isUpdate
      ? `Jadwal shift Anda tanggal ${tanggal} telah diperbarui menjadi ${tipe_shift} (${jam_mulai}–${jam_selesai}).`
      : `Jadwal shift baru: ${tanggal} · ${tipe_shift} · ${jam_mulai}–${jam_selesai}. Harap diperhatikan.`;

    // Kirim notifikasi ke setiap karyawan (batch)
    const notifications = employees.map(emp => ({
      nik_karyawan: emp.nik_karyawan,
      nama_karyawan: emp.nama_lengkap,
      judul: tipe,
      pesan,
      tipe,
      tanggal_jadwal: tanggal,
      dibaca: false
    }));

    // Buat satu per satu (bulkCreate tidak tersedia untuk service role)
    await Promise.all(
      notifications.map(n => base44.asServiceRole.entities.ShiftNotification.create(n))
    );

    return Response.json({ success: true, notified: notifications.length, tipe });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});