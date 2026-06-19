import http from 'http'

const data = JSON.stringify({ ingredients: ['番茄', '鸡蛋', '盐'] })

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/recommend',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}

console.log('Sending request with body:', data)

const req = http.request(options, (res) => {
  let body = ''
  res.on('data', chunk => { body += chunk })
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    console.log('Response:', body)
    try {
      const parsed = JSON.parse(body)
      console.log('Result count:', parsed.length)
      if (parsed.length > 0) {
        console.log('First result name:', parsed[0].name, 'match%:', parsed[0].matchPercentage)
      }
    } catch (e) {
      console.error('Parse error:', e)
    }
  })
})

req.on('error', (e) => {
  console.error('Request error:', e.message)
})

req.write(data)
req.end()
