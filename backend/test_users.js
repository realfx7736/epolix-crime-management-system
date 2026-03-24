require('dotenv').config();
const { supabase } = require('./config/supabase');

async function testOtpError() {
    console.log('Fetching users definition...');
    const { error, data } = await supabase.from('users').select('otp_hash, otp_expires_at, locked_until').limit(1);

    console.log('Users Select Error:', error);
}

testOtpError();
