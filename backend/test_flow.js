const url = 'http://localhost:5000/api';

async function testFlow() {
    console.log('1. Initiating Staff Login...');
    const loginRes = await fetch(`${url}/auth/terminal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'staff', identifier: 'STF-KL-2026-0001', password: 'password123' })
    });
    const loginData = await loginRes.json();
    console.log('Login Result:', loginData);

    if (!loginData.success) {
        console.error('Failed to initiate login.');
        return;
    }

    const { userId, otp } = loginData;
    console.log(`\n2. Verifying OTP: ${otp} for User: ${userId}`);

    const verifyRes = await fetch(`${url}/auth/terminal/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'staff', userId, otp })
    });
    const verifyData = await verifyRes.json();
    console.log('Verify Result:', verifyData);

    if (verifyData.success) {
        console.log('\n✅ Login & OTP Verification Flow completed successfully!');
    } else {
        console.log('\n❌ Verification Failed.');
    }
}

testFlow();
