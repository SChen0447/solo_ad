import express from 'express'
import cors from 'cors'

interface Song {
  id: string
  title: string
  artist: string
  cover: string
  rank: number
}

interface LyricLine {
  index: number
  text: string
}

interface BlankSlot {
  position: number
  answer: string
}

interface ChallengeLine {
  index: number
  original: string
  displayParts: string[]
  blanks: BlankSlot[]
}

interface FillBlankChallenge {
  songId: string
  songTitle: string
  lines: ChallengeLine[]
}

interface ScoreRequest {
  songId: string
  answers: { lineIndex: number; blankIndex: number; answer: string }[]
}

interface LineResult {
  lineIndex: number
  results: { blankIndex: number; correct: boolean; userAnswer: string; correctAnswer: string }[]
  lineScore: number
}

interface Score {
  songId: string
  songTitle: string
  totalScore: number
  maxScore: number
  lineResults: LineResult[]
}

const songs: Song[] = [
  {
    id: 'song-1',
    title: '晴天',
    artist: '周杰伦',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    rank: 1
  },
  {
    id: 'song-2',
    title: '稻香',
    artist: '周杰伦',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
    rank: 2
  },
  {
    id: 'song-3',
    title: '七里香',
    artist: '周杰伦',
    cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
    rank: 3
  },
  {
    id: 'song-4',
    title: '夜曲',
    artist: '周杰伦',
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    rank: 4
  },
  {
    id: 'song-5',
    title: '青花瓷',
    artist: '周杰伦',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
    rank: 5
  }
]

const fullLyrics: Record<string, LyricLine[]> = {
  'song-1': [
    { index: 0, text: '故事的小黄花从出生那年就飘着' },
    { index: 1, text: '童年的荡秋千随记忆一直晃到现在' },
    { index: 2, text: 'Re So So Si Do Si La So La Si Si Si Si La Si La So' },
    { index: 3, text: '吹着前奏望着天空我想起花瓣试着掉落' },
    { index: 4, text: '为你翘课的那一天花落的那一天' },
    { index: 5, text: '教室的那一间我怎么看不见' },
    { index: 6, text: '消失的下雨天我好想再淋一遍' },
    { index: 7, text: '没想到失去的勇气我还留着' },
    { index: 8, text: '好想再问一遍你会等待还是离开' },
    { index: 9, text: '刮风这天我试过握着你手' },
    { index: 10, text: '但偏偏雨渐渐大到我看你不见' },
    { index: 11, text: '还要多久我才能在你身边' },
    { index: 12, text: '等到放晴的那天也许我会比较好一点' },
    { index: 13, text: '从前从前有个人爱你很久' },
    { index: 14, text: '但偏偏风渐渐把距离吹得好远' },
    { index: 15, text: '好不容易又能再多爱一天' },
    { index: 16, text: '但故事的最后你好像还是说了拜拜' },
    { index: 17, text: '为你翘课的那一天花落的那一天' },
    { index: 18, text: '教室的那一间我怎么看不见' },
    { index: 19, text: '消失的下雨天我好想再淋一遍' },
    { index: 20, text: '没想到失去的勇气我还留着' },
    { index: 21, text: '好想再问一遍你会等待还是离开' },
    { index: 22, text: '刮风这天我试过握着你手' },
    { index: 23, text: '但偏偏雨渐渐大到我看你不见' }
  ],
  'song-2': [
    { index: 0, text: '对这个世界如果你有太多的抱怨' },
    { index: 1, text: '跌倒了就不敢继续往前走' },
    { index: 2, text: '为什么人要这么的脆弱堕落' },
    { index: 3, text: '请你打开电视看看' },
    { index: 4, text: '多少人为生命在努力勇敢的走下去' },
    { index: 5, text: '我们是不是该知足' },
    { index: 6, text: '珍惜一切就算没有拥有' },
    { index: 7, text: '还记得你说家是唯一的城堡' },
    { index: 8, text: '随着稻香河流继续奔跑' },
    { index: 9, text: '微微笑小时候的梦我知道' },
    { index: 10, text: '不要哭让萤火虫带着你逃跑' },
    { index: 11, text: '乡间的歌谣永远的依靠' },
    { index: 12, text: '回家吧回到最初的美好' },
    { index: 13, text: '不要这么容易就想放弃就像我说的' },
    { index: 14, text: '追不到的梦想换个梦不就得了' },
    { index: 15, text: '为自己的人生鲜艳上色' },
    { index: 16, text: '先把爱涂上喜欢的颜色' },
    { index: 17, text: '笑一个吧功成名就不是目的' },
    { index: 18, text: '让自己快乐快乐这才叫做意义' },
    { index: 19, text: '童年的纸飞机现在终于飞回我手里' },
    { index: 20, text: '所谓的那快乐赤脚在田里追蜻蜓追到累了' },
    { index: 21, text: '偷摘水果被蜜蜂给叮到怕了' },
    { index: 22, text: '谁在偷笑呢我靠着稻草人吹着风唱着歌睡着了' },
    { index: 23, text: '哦午后吉它在虫鸣中更清脆' }
  ],
  'song-3': [
    { index: 0, text: '窗外的麻雀在电线杆上多嘴' },
    { index: 1, text: '你说这一句很有夏天的感觉' },
    { index: 2, text: '手中的铅笔在纸上来来回回' },
    { index: 3, text: '我用几行字形容你是我的谁' },
    { index: 4, text: '秋刀鱼的滋味猫跟你都想了解' },
    { index: 5, text: '初恋的香味就这样被我们寻回' },
    { index: 6, text: '那温暖的阳光像刚摘的鲜艳草莓' },
    { index: 7, text: '你说你舍不得吃掉这一种感觉' },
    { index: 8, text: '雨下整夜我的爱溢出就像雨水' },
    { index: 9, text: '院子落叶跟我的思念厚厚一叠' },
    { index: 10, text: '几句是非也无法将我的热情冷却' },
    { index: 11, text: '你出现在我诗的每一页' },
    { index: 12, text: '雨下整夜我的爱溢出就像雨水' },
    { index: 13, text: '窗台蝴蝶像诗里纷飞的美丽章节' },
    { index: 14, text: '我接着写把永远爱你写进诗的结尾' },
    { index: 15, text: '你是我唯一想要的了解' },
    { index: 16, text: '雨下整夜我的爱溢出就像雨水' },
    { index: 17, text: '院子落叶跟我的思念厚厚一叠' },
    { index: 18, text: '几句是非也无法将我的热情冷却' },
    { index: 19, text: '你出现在我诗的每一页' },
    { index: 20, text: '那饱满的稻穗幸福了这个季节' },
    { index: 21, text: '而你的脸颊像田里熟透的蕃茄' },
    { index: 22, text: '你突然对我说七里香的名字很美' },
    { index: 23, text: '我此刻却只想亲吻你倔强的嘴' }
  ],
  'song-4': [
    { index: 0, text: '一群嗜血的蚂蚁被腐肉所吸引' },
    { index: 1, text: '我面无表情看孤独的风景' },
    { index: 2, text: '失去你爱恨开始分明' },
    { index: 3, text: '失去你还有什么事好关心' },
    { index: 4, text: '当鸽子不再象征和平' },
    { index: 5, text: '我终于被提醒广场上喂食的是秃鹰' },
    { index: 6, text: '我用漂亮的押韵形容被掠夺一空的爱情' },
    { index: 7, text: '啊乌云开始遮蔽夜色不干净' },
    { index: 8, text: '公园里葬礼的回音在漫天飞行' },
    { index: 9, text: '送你的白色玫瑰在纯黑的环境凋零' },
    { index: 10, text: '乌鸦在树枝上诡异的很安静' },
    { index: 11, text: '静静听我黑色的大衣想温暖你日渐冰冷的回忆' },
    { index: 12, text: '走过的走过的生命' },
    { index: 13, text: '啊四周弥漫雾气' },
    { index: 14, text: '啊我在空旷的墓地' },
    { index: 15, text: '老去后还爱你' },
    { index: 16, text: '为你弹奏萧邦的夜曲' },
    { index: 17, text: '纪念我死去的爱情' },
    { index: 18, text: '跟夜风一样的声音心碎的很好听' },
    { index: 19, text: '手在键盘敲很轻我给的思念很小心' },
    { index: 20, text: '你埋葬的地方叫幽冥' },
    { index: 21, text: '为你弹奏萧邦的夜曲' },
    { index: 22, text: '纪念我死去的爱情' },
    { index: 23, text: '而我为你隐姓埋名在月光下弹琴' }
  ],
  'song-5': [
    { index: 0, text: '素胚勾勒出青花笔锋浓转淡' },
    { index: 1, text: '瓶身描绘的牡丹一如你初妆' },
    { index: 2, text: '冉冉檀香透过窗心事我了然' },
    { index: 3, text: '宣纸上走笔至此搁一半' },
    { index: 4, text: '釉色渲染仕女图韵味被私藏' },
    { index: 5, text: '而你嫣然的一笑如含苞待放' },
    { index: 6, text: '你的美一缕飘散去到我去不了的地方' },
    { index: 7, text: '天青色等烟雨而我在等你' },
    { index: 8, text: '炊烟袅袅升起隔江千万里' },
    { index: 9, text: '在瓶底书汉隶仿前朝的飘逸' },
    { index: 10, text: '就当我为遇见你伏笔' },
    { index: 11, text: '天青色等烟雨而我在等你' },
    { index: 12, text: '月色被打捞起晕开了结局' },
    { index: 13, text: '如传世的青花瓷自顾自美丽' },
    { index: 14, text: '你眼带笑意' },
    { index: 15, text: '色白花青的锦鲤跃然于碗底' },
    { index: 16, text: '临摹宋体落款时却惦记着你' },
    { index: 17, text: '你隐藏在窑烧里千年的秘密' },
    { index: 18, text: '极细腻犹如绣花针落地' },
    { index: 19, text: '帘外芭蕉惹骤雨门环惹铜绿' },
    { index: 20, text: '而我路过那江南小镇惹了你' },
    { index: 21, text: '在泼墨山水画里你从墨色深处被隐去' },
    { index: 22, text: '天青色等烟雨而我在等你' },
    { index: 23, text: '炊烟袅袅升起隔江千万里' }
  ]
}

function splitWords(text: string): string[] {
  const parts: string[] = []
  let current = ''
  for (const char of text) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      if (current) {
        parts.push(current)
        current = ''
      }
      parts.push(char)
    } else if (/[a-zA-Z0-9]/.test(char)) {
      current += char
    } else {
      if (current) {
        parts.push(current)
        current = ''
      }
      parts.push(char)
    }
  }
  if (current) parts.push(current)
  return parts
}

function generateChallenge(songId: string, lyrics: LyricLine[]): FillBlankChallenge {
  const song = songs.find(s => s.id === songId)!
  const selectedLines = lyrics.slice(0, 10)

  const challengeLines: ChallengeLine[] = selectedLines.map(line => {
    const words = splitWords(line.text)
    const wordIndices = words
      .map((w, i) => ({ word: w, index: i }))
      .filter(item => /[\u4e00-\u9fa5a-zA-Z0-9]/.test(item.word))

    const blankCount = Math.min(2 + Math.floor(Math.random() * 2), wordIndices.length)
    const shuffled = [...wordIndices].sort(() => Math.random() - 0.5)
    const selectedBlanks = shuffled.slice(0, blankCount).sort((a, b) => a.index - b.index)

    const blanks: BlankSlot[] = []
    const displayParts: string[] = []
    let lastEnd = 0

    for (let i = 0; i < selectedBlanks.length; i++) {
      const { word, index } = selectedBlanks[i]
      if (index > lastEnd) {
        displayParts.push(words.slice(lastEnd, index).join(''))
      }
      displayParts.push('___BLANK___')
      blanks.push({ position: i, answer: word })
      lastEnd = index + 1
    }

    if (lastEnd < words.length) {
      displayParts.push(words.slice(lastEnd).join(''))
    }

    return {
      index: line.index,
      original: line.text,
      displayParts,
      blanks
    }
  })

  return {
    songId,
    songTitle: song.title,
    lines: challengeLines
  }
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/songs', (_req, res) => {
  res.json(songs)
})

app.get('/api/lyrics/:id', (req, res) => {
  const songId = req.params.id
  const lyrics = fullLyrics[songId]
  const song = songs.find(s => s.id === songId)

  if (!lyrics || !song) {
    res.status(404).json({ error: 'Song not found' })
    return
  }

  const challenge = generateChallenge(songId, lyrics)

  res.json({
    song,
    lyrics,
    challenge
  })
})

app.post('/api/score', (req, res) => {
  const { songId, answers }: ScoreRequest = req.body
  const lyrics = fullLyrics[songId]
  const song = songs.find(s => s.id === songId)

  if (!lyrics || !song) {
    res.status(404).json({ error: 'Song not found' })
    return
  }

  const challenge = generateChallenge(songId, lyrics)
  const lineResults: LineResult[] = []
  let totalScore = 0
  let totalBlanks = 0

  challenge.lines.forEach(cline => {
    const lineAnswers = answers.filter(a => a.lineIndex === cline.index)
    const results: LineResult['results'] = []
    let lineScore = 0

    cline.blanks.forEach(blank => {
      const userAnswerData = lineAnswers.find(a => a.blankIndex === blank.position)
      const userAnswer = userAnswerData?.answer || ''
      const correct = userAnswer.trim() === blank.answer.trim()

      if (correct) {
        lineScore += 10 / 3
      }

      totalBlanks++
      results.push({
        blankIndex: blank.position,
        correct,
        userAnswer,
        correctAnswer: blank.answer
      })
    })

    totalScore += lineScore
    lineResults.push({
      lineIndex: cline.index,
      results,
      lineScore
    })
  })

  const maxScore = totalBlanks * (10 / 3)

  const score: Score = {
    songId,
    songTitle: song.title,
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    lineResults
  }

  res.json(score)
})

const PORT = 3002
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
