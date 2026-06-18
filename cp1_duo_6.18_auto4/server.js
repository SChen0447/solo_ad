import http from 'http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8080

const store = {
  elements: [],
  users: new Map(),
}

function broadcastToAll(data, excludeId = null) {
  const payload = JSON.stringify(data)
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      if (excludeId && client._wsId === excludeId) return
      client.send(payload)
    }
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && url.pathname === '/generate-summary') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}')
        const elements = Array.isArray(data.elements) ? data.elements : []

        const textNodes = elements
          .filter((el) => el.type === 'text' && el.text && String(el.text).trim())
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))

        const shapeNodes = elements
          .filter((el) => el.type === 'rect' || el.type === 'ellipse')
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))

        const strokeNodes = elements
          .filter((el) => el.type === 'stroke' && el.points && el.points.length > 1)
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))

        const lines = []
        lines.push('【会议纪要】')
        lines.push('生成时间：' + new Date().toLocaleString('zh-CN'))
        lines.push('')

        if (textNodes.length > 0) {
          lines.push('一、讨论要点（文本）')
          textNodes.forEach((el, i) => {
            lines.push(`  ${i + 1}. ${String(el.text).trim()}`)
          })
          lines.push('')
        }

        if (shapeNodes.length > 0) {
          lines.push('二、图形标注')
          shapeNodes.forEach((el, i) => {
            const name = el.type === 'rect' ? '矩形' : '椭圆'
            const label =
              (el.width || 0) > 200
                ? '（重点框）'
                : (el.width || 0) > 100
                  ? '（标注框）'
                  : '（小标注）'
            lines.push(`  ${i + 1}. ${name}${label} - 位于 (${Math.round(el.x)}, ${Math.round(el.y)})`)
          })
          lines.push('')
        }

        if (strokeNodes.length > 0) {
          lines.push('三、手绘笔迹')
          const totalLength = strokeNodes.reduce((s, el) => s + (el.points?.length || 0), 0)
          lines.push(`  共 ${strokeNodes.length} 条手绘笔迹，约 ${totalLength} 个绘制点。`)
          lines.push('')
        }

        const summary = lines.join('\n').trim()

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(
          JSON.stringify({
            summary,
            stats: {
              texts: textNodes.length,
              shapes: shapeNodes.length,
              strokes: strokeNodes.length,
              total: elements.length,
            },
          })
        )
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ summary: '生成失败：' + String(err.message || err) }))
      }
    })
    return
  }

  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(
      JSON.stringify({
        ok: true,
        name: '绘记白板协作服务器',
        connectedClients: wss.clients.size,
        storedElements: store.elements.length,
        storedUsers: store.users.size,
      })
    )
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  ws._wsId = Math.random().toString(36).slice(2, 10)

  ws.send(
    JSON.stringify({
      type: 'init',
      elements: store.elements,
      users: Array.from(store.users.values()),
    })
  )

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw))

      if (msg.type === 'join' && msg.user) {
        store.users.set(msg.user.id, msg.user)
        broadcastToAll({ type: 'join', user: msg.user, userId: msg.user.id })
        broadcastToAll(
          {
            type: 'sync',
            elements: store.elements,
            users: Array.from(store.users.values()),
          },
          ws._wsId
        )
        return
      }

      if (msg.type === 'leave' && msg.userId) {
        store.users.delete(msg.userId)
        broadcastToAll({ type: 'leave', userId: msg.userId })
        return
      }

      if (msg.type === 'add' && msg.element) {
        const exists = store.elements.find((e) => e.id === msg.element.id)
        if (!exists) {
          store.elements.push(msg.element)
        } else {
          const idx = store.elements.findIndex((e) => e.id === msg.element.id)
          store.elements[idx] = { ...store.elements[idx], ...msg.element }
        }
        broadcastToAll({ type: 'add', element: msg.element, userId: msg.userId }, ws._wsId)
        return
      }

      if (msg.type === 'update' && msg.element) {
        const idx = store.elements.findIndex((e) => e.id === msg.element.id)
        if (idx >= 0) {
          store.elements[idx] = { ...store.elements[idx], ...msg.element }
        }
        broadcastToAll({ type: 'update', element: msg.element, userId: msg.userId }, ws._wsId)
        return
      }

      if (msg.type === 'delete' && msg.element) {
        store.elements = store.elements.filter((e) => e.id !== msg.element.id)
        broadcastToAll({ type: 'delete', element: msg.element, userId: msg.userId }, ws._wsId)
        return
      }

      if (msg.type === 'cursor') {
        broadcastToAll(
          { type: 'cursor', cursor: msg.cursor, userId: msg.userId },
          ws._wsId
        )
        return
      }
    } catch (err) {
      console.error('[ws parse error]', err)
    }
  })

  ws.on('close', () => {
    const entries = Array.from(store.users.entries())
    // 找到可能属于这个 ws 的用户：如果该用户 id 对应的所有 ws 都掉线了，则移除
    // 这里简化处理：当用户连接全部断开时再从 users 中清理
    for (const [uid, user] of entries) {
      // 检查是否有其他 ws 代表这个用户：
      const stillAlive = Array.from(wss.clients).some((c) => {
        if (c.readyState !== 1) return false
        // 不严格绑定：若此 uid 在 store 中但所有 ws 都不记得 join 的 user，则下线
        return false
      })
      // 保守策略：不在此处删除用户
      void stillAlive
      void user
    }
  })
})

server.listen(PORT, () => {
  console.log('')
  console.log('  ╔══════════════════════════════════════════════╗')
  console.log(`  ║  绘记白板协作服务已启动                       ║`)
  console.log(`  ║  • HTTP / API : http://localhost:${PORT}         ║`)
  console.log(`  ║  • WebSocket : ws://localhost:${PORT}           ║`)
  console.log(`  ║  • 前端端口  : 3000 (npm run dev)              ║`)
  console.log('  ╚══════════════════════════════════════════════╝')
  console.log('')
})
