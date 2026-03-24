require('dotenv').config();
const https = require('https');

const options = {
    hostname: 'dlpnjbbmzfwxbvwqzuxh.supabase.co',
    port: 443,
    path: '/rest/v1/?apikey=' + process.env.SUPABASE_ANON_KEY,
    method: 'GET'
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        const spec = JSON.parse(data);
        console.log(JSON.stringify(spec.definitions.otp_tokens, null, 2));
    });
});

req.on('error', e => console.error(e));
req.end();
