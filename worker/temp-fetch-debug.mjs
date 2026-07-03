const url = 'http://localhost:8787/api/functions';
const payload = { name: 'weeklyAreaReport', payload: {} };

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log('status', res.status);
  console.log('headers', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('body', text);
} catch (err) {
  console.error('error', err);
}
