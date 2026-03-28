require('dotenv').config();
const authService = require('./services/authService');
const otpService = require('./services/otpService');

async function testAuth() {
    try {
        console.log("Testing Police Terminal Login...");
        // This will simulate sending an OTP
        const res = await authService.terminalLogin('police', 'OFF-001', 'password123', '127.0.0.1');
        console.log("Terminal Login Response:", res);

        console.log("\nTesting OTP Verification...");
        const verifyRes = await authService.verifyOTP(res.userId, 'police', res.otp || '123456', '127.0.0.1');
        console.log("Verify Response:", verifyRes);
    } catch (e) {
        console.error("Test Error:", e.message);
    }
}

testAuth();
