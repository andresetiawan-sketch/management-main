async function invoke(name, payload) {
  try {
    const res = await fetch('http://127.0.0.1:8787/api/functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, payload }),
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('HEADERS', Object.fromEntries(res.headers.entries()));
    console.log('BODY', text);
  } catch (err) {
    console.error('Request failed', err);
  }
}

invoke('employeeLogin', { nik: '001', password: '123456' });

// Also try getEmployeeByNik
invoke('getEmployeeByNik', { nik: '001' });

// Test archiveOldData and approveShiftSwap
setTimeout(() => invoke('archiveOldData', { entity_name: 'attendance', months: 1 }), 500);
setTimeout(() => invoke('approveShiftSwap', { shiftSwapId: 'nonexistent' }), 1000);
