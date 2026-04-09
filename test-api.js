
const fetch = require('node-fetch');

async function testRegistration() {
  const email = `test_${Date.now()}@example.com`;
  const payload = {
    email: email,
    password: 'Password123!',
    role: 'vendor',
    name: 'Test Vendor',
    phone: '11999999999',
    city: 'Sao Paulo',
    notes: 'Test notes'
  };

  console.log('Testing registration for:', email);

  try {
    const response = await fetch('http://localhost:5174/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Registration successful!');
      if (data.id) {
        console.log('User ID:', data.id);
        console.log('Dev Code:', data.devCode);
      }
    } else {
      console.log('❌ Registration failed');
    }
  } catch (error) {
    console.error('Error during fetch:', error.message);
  }
}

testRegistration();
