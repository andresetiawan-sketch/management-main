import https from 'https';

const data = JSON.stringify({nik: '123456', password: '123456'});

const opts = {
  hostname: 'app-pis-api-production.andre-setiawanworkersdev.workers.dev',
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(opts, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      console.log(JSON.parse(body));
    } catch (e) {
      console.log('Raw:', body);
    }
  });
});

req.on('error', err => console.error('Error:', err));
req.write(data);
req.end();
