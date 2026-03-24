require('dotenv').config();
const { supabase } = require('./config/supabase');

async function testOtpError() {
    console.log('Fetching otp_tokens definition...');
    const { error, data } = await supabase.from('otp_tokens').select('*').limit(1);

    console.log('OTP Select Error:', error);
    console.log('OTP Data:', data);
}

testOtpError();
