const http = require('http')

function sendRequest(path, method, data) {
  return new Promise((resolve) => {
    const body = data !== undefined ? JSON.stringify(data) : ''
    const options = {
      hostname: 'localhost',
      port: 3002,
      path,
      method,
      headers: body ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      } : {}
    }
    const req = http.request(options, (res) => {
      let responseBody = ''
      res.on('data', chunk => { responseBody += chunk })
      res.on('end', () => {
        resolve({ status: res.statusCode, body: responseBody })
      })
    })
    req.on('error', (e) => resolve({ error: e.message }))
    if (body) req.write(body)
    req.end()
  })
}

async function test() {
  console.log('=== Test 1: Empty body ===')
  let r = await sendRequest('/api/recommend', 'POST')
  console.log('Status:', r.status, 'Body:', r.body)

  console.log('\n=== Test 2: Missing ingredients field ===')
  r = await sendRequest('/api/recommend', 'POST', { foo: 'bar' })
  console.log('Status:', r.status, 'Body:', r.body)

  console.log('\n=== Test 3: ingredients not array ===')
  r = await sendRequest('/api/recommend', 'POST', { ingredients: 'tomato' })
  console.log('Status:', r.status, 'Body:', r.body)

  console.log('\n=== Test 4: ingredients empty array ===')
  r = await sendRequest('/api/recommend', 'POST', { ingredients: [] })
  console.log('Status:', r.status, 'Body:', r.body)

  console.log('\n=== Test 5: ingredients with non-string items ===')
  r = await sendRequest('/api/recommend', 'POST', { ingredients: ['番茄', 123, true] })
  console.log('Status:', r.status, 'Body:', r.body)

  console.log('\n=== Test 6: Valid request ===')
  r = await sendRequest('/api/recommend', 'POST', { ingredients: ['番茄', '鸡蛋', '盐'] })
  const parsed = JSON.parse(r.body)
  console.log('Status:', r.status, 'Result count:', parsed.length)
  if (parsed.length > 0) {
    console.log('Top match:', parsed[0].name, `${parsed[0].matchPercentage}%`)
  }

  console.log('\n=== Test 7: GET /api/recipes (should work) ===')
  r = await sendRequest('/api/recipes', 'GET')
  const recipes = JSON.parse(r.body)
  console.log('Status:', r.status, 'Recipe count:', recipes.length)
}

test()
