import { handleFunctionInvoke } from './src/handlers/functions.js';

const req = new Request('http://localhost/api/functions', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'weeklyAreaReport', payload: {} }),
});

const env = { JWT_SECRET: 'test', DB: null, STORAGE: null };

try {
  const res = await handleFunctionInvoke(req, env);
  console.log('status', res.status);
  console.log(await res.text());
} catch (err) {
  console.error('error', err);
}
