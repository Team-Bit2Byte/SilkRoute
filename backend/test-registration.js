#!/usr/bin/env node

// Test registration endpoint
const testRegistration = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        userType: 'buyer'
      }),
    });

    const data = await response.json();
    console.log('Registration test result:', data);
    
    if (data.success) {
      console.log('✅ Registration working!');
    } else {
      console.log('❌ Registration failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('Make sure backend is running on port 5000');
  }
};

testRegistration();
