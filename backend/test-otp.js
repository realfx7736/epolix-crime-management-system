(async () => {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile_number: '9333333333' })
    });
    const data = await res.json();
    console.log('SEND OTP RESPONSE:', data);
    
    if (data.success) {
      const verifyRes = await fetch('http://127.0.0.1:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: '9333333333', otp: data.otp || '123456' })
      });
      const verifyData = await verifyRes.json();
      console.log('VERIFY OTP RESPONSE:', verifyData);
    }
  } catch (err) {
    console.error('Test Failed:', err.message);
  }
})();
