const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  try {
    const health = await makeRequest('/api/health');
    console.log('Health check:', health.status, health.body);

    const ideas = await makeRequest('/api/ideas');
    console.log('Ideas list:', ideas.status, ideas.body.substring(0, 300) + '...');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
