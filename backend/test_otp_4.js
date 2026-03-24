require('dotenv').config();
const { supabase } = require('./config/supabase');

async function testOtpError() {
    const cols = ['user_id', 'role', 'otp_hash', 'otp', 'attempts', 'expires_at', 'created_at'];
    for (const c of cols) {
        const { error } = await supabase.from('otp_tokens').select(c).limit(1);
        if (error) {
            console.log(c, 'MISSING:', error.message);
        } else {
            console.log(c, 'EXISTS!');
        }
    }
}

testOtpError();
