import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

export interface Card {
  id: string
  name: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  attack: number
  defense: number
  imageUrl: string
}

export interface Stats {
  player1Wins: number
  player2Wins: number
  draws: number
  cardUsage: Record<string, number>
}

export interface BattleRecord {
  id: string
  player1Cards: string[]
  player2Cards: string[]
  winner: 'player1' | 'player2' | 'draw'
  timestamp: number
}

const cards: Card[] = [
  { id: uuidv4(), name: '烈焰战士', rarity: 'common', attack: 4, defense: 3, imageUrl: 'https://picsum.photos/seed/card1/200/280' },
  { id: uuidv4(), name: '冰霜法师', rarity: 'rare', attack: 5, defense: 2, imageUrl: 'https://picsum.photos/seed/card2/200/280' },
  { id: uuidv4(), name: '暗影刺客', rarity: 'epic', attack: 7, defense: 2, imageUrl: 'https://picsum.photos/seed/card3/200/280' },
  { id: uuidv4(), name: '圣光骑士', rarity: 'legendary', attack: 6, defense: 7, imageUrl: 'https://picsum.photos/seed/card4/200/280' },
  { id: uuidv4(), name: '森林守卫', rarity: 'common', attack: 3, defense: 5, imageUrl: 'https://picsum.photos/seed/card5/200/280' },
  { id: uuidv4(), name: '雷霆之锤', rarity: 'rare', attack: 6, defense: 3, imageUrl: 'https://picsum.photos/seed/card6/200/280' },
  { id: uuidv4(), name: '深海巨兽', rarity: 'epic', attack: 5, defense: 6, imageUrl: 'https://picsum.photos/seed/card7/200/280' },
  { id: uuidv4(), name: '凤凰涅槃', rarity: 'legendary', attack: 8, defense: 4, imageUrl: 'https://picsum.photos/seed/card8/200/280' },
  { id: uuidv4(), name: '石头人', rarity: 'common', attack: 2, defense: 6, imageUrl: 'https://picsum.photos/seed/card9/200/280' },
  { id: uuidv4(), name: '精灵弓手', rarity: 'rare', attack: 5, defense: 2, imageUrl: 'https://picsum.photos/seed/card10/200/280' },
  { id: uuidv4(), name: '死灵法师', rarity: 'epic', attack: 6, defense: 3, imageUrl: 'https://picsum.photos/seed/card11/200/280' },
  { id: uuidv4(), name: '龙骑士', rarity: 'legendary', attack: 9, defense: 6, imageUrl: 'https://picsum.photos/seed/card12/200/280' },
  { id: uuidv4(), name: '野狼', rarity: 'common', attack: 3, defense: 2, imageUrl: 'https://picsum.photos/seed/card13/200/280' },
  { id: uuidv4(), name: '石像鬼', rarity: 'rare', attack: 4, defense: 5, imageUrl: 'https://picsum.photos/seed/card14/200/280' },
  { id: uuidv4(), name: '九头蛇', rarity: 'epic', attack: 7, defense: 5, imageUrl: 'https://picsum.photos/seed/card15/200/280' },
  { id: uuidv4(), name: '大天使', rarity: 'legendary', attack: 7, defense: 8, imageUrl: 'https://picsum.photos/seed/card16/200/280' },
  { id: uuidv4(), name: '民兵', rarity: 'common', attack: 2, defense: 3, imageUrl: 'https://picsum.photos/seed/card17/200/280' },
  { id: uuidv4(), name: '海盗船长', rarity: 'rare', attack: 5, defense: 3, imageUrl: 'https://picsum.photos/seed/card18/200/280' },
  { id: uuidv4(), name: '独眼巨人', rarity: 'epic', attack: 8, defense: 3, imageUrl: 'https://picsum.photos/seed/card19/200/280' },
  { id: uuidv4(), name: '时空术士', rarity: 'legendary', attack: 6, defense: 5, imageUrl: 'https://picsum.photos/seed/card20/200/280' },
  { id: uuidv4(), name: '毒蜘蛛', rarity: 'common', attack: 3, defense: 1, imageUrl: 'https://picsum.photos/seed/card21/200/280' },
  { id: uuidv4(), name: '雪人', rarity: 'rare', attack: 3, defense: 6, imageUrl: 'https://picsum.photos/seed/card22/200/280' },
  { id: uuidv4(), name: '美杜莎', rarity: 'epic', attack: 5, defense: 4, imageUrl: 'https://picsum.photos/seed/card23/200/280' },
  { id: uuidv4(), name: '泰坦', rarity: 'legendary', attack: 10, defense: 9, imageUrl: 'https://picsum.photos/seed/card24/200/280' },
  { id: uuidv4(), name: '骷髅兵', rarity: 'common', attack: 2, defense: 2, imageUrl: 'https://picsum.photos/seed/card25/200/280' },
  { id: uuidv4(), name: '狼人', rarity: 'rare', attack: 5, defense: 3, imageUrl: 'https://picsum.photos/seed/card26/200/280' },
  { id: uuidv4(), name: '吸血鬼伯爵', rarity: 'epic', attack: 6, defense: 4, imageUrl: 'https://picsum.photos/seed/card27/200/280' },
  { id: uuidv4(), name: '世界树守护者', rarity: 'legendary', attack: 5, defense: 10, imageUrl: 'https://picsum.photos/seed/card28/200/280' },
]

const stats: Stats = {
  player1Wins: 12,
  player2Wins: 8,
  draws: 3,
  cardUsage: {}
}

cards.forEach((card, index) => {
  stats.cardUsage[card.id] = Math.floor(Math.random() * 20) + 1
})

const battleRecords: BattleRecord[] = []

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/cards', (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 24
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedCards = cards.slice(start, end)
  res.json({ cards: paginatedCards, total: cards.length, page, pageSize })
})

app.post('/api/cards', (req, res) => {
  const { name, rarity, attack, defense, imageUrl } = req.body
  const newCard: Card = {
    id: uuidv4(),
    name,
    rarity,
    attack: Number(attack),
    defense: Number(defense),
    imageUrl: imageUrl || `https://picsum.photos/seed/${uuidv4()}/200/280`
  }
  cards.push(newCard)
  stats.cardUsage[newCard.id] = 0
  res.status(201).json(newCard)
})

app.post('/api/battle', (req, res) => {
  const { player1Cards, player2Cards, winner } = req.body
  
  const record: BattleRecord = {
    id: uuidv4(),
    player1Cards,
    player2Cards,
    winner,
    timestamp: Date.now()
  }
  battleRecords.push(record)
  
  if (winner === 'player1') {
    stats.player1Wins++
  } else if (winner === 'player2') {
    stats.player2Wins++
  } else {
    stats.draws++
  }
  
  ;[...player1Cards, ...player2Cards].forEach(cardId => {
    stats.cardUsage[cardId] = (stats.cardUsage[cardId] || 0) + 1
  })
  
  res.json({ success: true, record })
})

app.get('/api/stats', (req, res) => {
  res.json(stats)
})

app.get('/api/cards/all', (req, res) => {
  res.json({ cards, total: cards.length })
})

const PORT = 3002

let serverInstance: any = null

export function startServer() {
  if (serverInstance) {
    return serverInstance
  }
  
  serverInstance = app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`)
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} in use, server already running`)
    } else {
      console.error('Server error:', err)
    }
  })
  return serverInstance
}

export default app
