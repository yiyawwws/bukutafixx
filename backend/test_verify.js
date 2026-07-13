const login = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'password' })
    });
    const data = await res.json();
    console.log('Login:', data);
    const token = data.token;
    
    if (!token) return;
    
    // create new user
    const resReg = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TestUser', email: 'test_verify@test.com', password: 'password', nim: '123', university: 'UNM' })
    });
    const regData = await resReg.json();
    console.log('Register:', regData);
    
    const targetId = regData.user.id;
    
    const verifyRes = await fetch('http://localhost:5000/api/users/' + targetId + '/verify', {
      method: 'PUT',
      headers: { 'Cookie': 'token=' + token }
    });
    const verifyData = await verifyRes.json();
    console.log('Verify res:', verifyData);
  } catch (e) {
    console.error('Error:', e.message);
  }
};
login();
