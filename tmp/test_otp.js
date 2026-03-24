const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { supabase } = require('../backend/config/supabase');

async function testOtpError() {
    const otpHash = 'fake_hash';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: user, error: userErr } = await supabase.from('users').select('*').eq('role', 'police').single();
    if (userErr || !user) {
        console.log('No police user found!', userErr);
        return;
    }
    console.log('Testing with User:', user.id);

    const { error: otpError, data } = await supabase.from('otp_tokens').upsert([{
        user_id: user.id,
        role: 'police',
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString()
    }], { onConflict: 'user_id,role' });

    console.log('OTP Upsert Error:', otpError);
    console.log('OTP Data:', data);
}

testOtpError();
