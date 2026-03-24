const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/terminal/verify-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => { console.log('HTTP', res.statusCode, data); });
});

req.on('error', e => console.error(e));
req.write(JSON.stringify({ role: 'police', userId: '5e8b4d35-f698-4a45-bd51-d3d8be7e0476', otp: process.argv[2] }));
req.end();
