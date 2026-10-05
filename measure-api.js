import http from 'http';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const time = performance.now() - t0;
        resolve({ status: res.statusCode, time: time.toFixed(2), body: JSON.parse(body || '{}') });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function benchmark() {
  console.log('--- Benchmarking khata-book APIs on http://localhost:5000 ---');

  // 1. Check email
  const checkEmail = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/check-email',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@khatabook.com' });
  console.log(`POST /api/v1/auth/check-email: ${checkEmail.time}ms (status ${checkEmail.status})`);

  // 2. Admin Login
  const login = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@khatabook.com', password: 'Admin@123' });
  console.log(`POST /api/v1/auth/admin/login: ${login.time}ms (status ${login.status})`);

  const token = login.body?.data?.access_token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Settings
  const setting = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/settings',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`GET /api/v1/settings: ${setting.time}ms (status ${setting.status})`);

  // 4. Users list
  const users = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/users',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`GET /api/v1/users: ${users.time}ms (status ${users.status})`);

  // 5. Expenses list
  const expenses = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/expenses',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`GET /api/v1/expenses: ${expenses.time}ms (status ${expenses.status})`);

  // 6. Expenses Totals
  const totals = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/expenses/totals/users',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`GET /api/v1/expenses/totals/users: ${totals.time}ms (status ${totals.status})`);

  // 7. Daily Expenses list
  const daily = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/daily-expenses',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`GET /api/v1/daily-expenses: ${daily.time}ms (status ${daily.status})`);

  // 8. Daily Expenses Charts
  const chart = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/daily-expenses/chart?year=2026&month=10',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`GET /api/v1/daily-expenses/chart: ${chart.time}ms (status ${chart.status})`);

  // Repeat each 3 times to get average warm timing
  console.log('\n--- Measuring Warm Repeat Calls (3 iterations) ---');
  for (let i = 1; i <= 3; i++) {
    const s = await request({ hostname: 'localhost', port: 5000, path: '/api/v1/settings', method: 'GET', headers: authHeaders });
    const u = await request({ hostname: 'localhost', port: 5000, path: '/api/v1/users', method: 'GET', headers: authHeaders });
    const e = await request({ hostname: 'localhost', port: 5000, path: '/api/v1/expenses', method: 'GET', headers: authHeaders });
    const t = await request({ hostname: 'localhost', port: 5000, path: '/api/v1/expenses/totals/users', method: 'GET', headers: authHeaders });
    const d = await request({ hostname: 'localhost', port: 5000, path: '/api/v1/daily-expenses', method: 'GET', headers: authHeaders });
    const c = await request({ hostname: 'localhost', port: 5000, path: '/api/v1/daily-expenses/chart?year=2026&month=10', method: 'GET', headers: authHeaders });
    console.log(`Run ${i}: Settings: ${s.time}ms | Users: ${u.time}ms | Expenses: ${e.time}ms | Totals: ${t.time}ms | Daily: ${d.time}ms | Chart: ${c.time}ms`);
  }
}

benchmark().catch(console.error);
