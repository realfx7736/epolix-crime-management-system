require('dotenv').config();
const { supabase } = require('./config/supabase');

async function testOtpError() {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error, data } = await supabase.from('otp_tokens').insert([{
        user_id: '5e8b4d35-f698-4a45-bd51-d3d8be7e0476',
        identifier: 'OFF-001',
        otp_code: '123456789012345678901234567890123456789012345678901234567890',
        purpose: 'police',
        expires_at: expiresAt
    }]);

    console.log('OTP Insert Error:', error);
}

testOtpError();
