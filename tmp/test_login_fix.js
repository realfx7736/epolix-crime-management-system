const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { sendLoginOTP } = require('../backend/services/authService');

async function test() {
    console.log('Testing sendLoginOTP locally with 7736281572...');
    try {
        const result = await sendLoginOTP('7736281572', '127.0.0.1');
        console.log('✅ Success:', result);
    } catch (e) {
        console.error('❌ Failed:', e.message);
    }
}

test();
