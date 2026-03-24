const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/terminal/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => { console.log('HTTP', res.statusCode, data); });
});

req.on('error', e => console.error(e));
req.write(JSON.stringify({ role: 'police', identifier: 'OFF-001', password: 'password123' }));
req.end();
