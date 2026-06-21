import express, { Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, '..', 'evaluation.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    activity_name TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    from_member_id TEXT NOT NULL,
    to_member_id TEXT NOT NULL,
    style TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (from_member_id) REFERENCES members(id),
    FOREIGN KEY (to_member_id) REFERENCES members(id),
    UNIQUE(room_id, from_member_id, to_member_id)
  );
`);

const COLOR_PALETTE = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4',
  '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3', '#A8D8EA', '#AA96DA'
];

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '怎么', '这个', '那个',
  '啊', '呢', '吧', '呀', '哦', '嗯', '哈', '啦', '吗', '嘛', '哦', '哈'
]);

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function segmentChinese(text: string): string[] {
  const result: string[] = [];
  const nounPattern = /[\u4e00-\u9fa5]{2,4}/g;
  let match;
  while ((match = nounPattern.exec(text)) !== null) {
    const word = match[0];
    if (!STOP_WORDS.has(word) && word.length >= 2) {
      result.push(word);
    }
  }
  return result;
}

function calculateWordFrequency(evaluations: Array<{ style: string; content: string }>) {
  const styleWordFreq: Record<string, Record<string, number>> = {
    encourage: {},
    constructive: {},
    humorous: {}
  };

  evaluations.forEach(evalItem => {
    const words = segmentChinese(evalItem.content);
    const style = evalItem.style as keyof typeof styleWordFreq;
    words.forEach(word => {
      styleWordFreq[style][word] = (styleWordFreq[style][word] || 0) + 1;
    });
  });

  return styleWordFreq;
}

app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const { activityName, memberNames } = req.body;

    if (!activityName || !memberNames || memberNames.length < 2 || memberNames.length > 15) {
      return res.status(400).json({ error: '活动名称必填，成员数量需在2-15人之间' });
    }

    let code: string;
    let exists;
    do {
      code = generateRoomCode();
      exists = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code);
    } while (exists);

    const roomId = uuidv4();
    const creatorId = uuidv4();

    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, code, activity_name, creator_id, status)
      VALUES (?, ?, ?, ?, 'active')
    `);
    insertRoom.run(roomId, code, activityName, creatorId);

    const insertMember = db.prepare(`
      INSERT INTO members (id, room_id, name, color)
      VALUES (?, ?, ?, ?)
    `);

    memberNames.forEach((name: string, index: number) => {
      const memberId = index === 0 ? creatorId : uuidv4();
      const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
      insertMember.run(memberId, roomId, name, color);
    });

    res.json({ roomId, code, creatorId });
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({ error: '创建房间失败' });
  }
});

app.get('/api/rooms/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as any;

    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const members = db.prepare('SELECT * FROM members WHERE room_id = ?').all(room.id);

    res.json({
      ...room,
      members
    });
  } catch (error) {
    console.error('获取房间信息失败:', error);
    res.status(500).json({ error: '获取房间信息失败' });
  }
});

app.post('/api/rooms/:code/join', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { memberId } = req.body;

    const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as any;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ? AND room_id = ?').get(memberId, room.id);
    if (!member) {
      return res.status(404).json({ error: '成员不存在' });
    }

    res.json({ success: true, room, member });
  } catch (error) {
    console.error('加入房间失败:', error);
    res.status(500).json({ error: '加入房间失败' });
  }
});

app.post('/api/evaluations', (req: Request, res: Response) => {
  try {
    const { roomId, fromMemberId, toMemberId, style, content } = req.body;

    if (!roomId || !fromMemberId || !toMemberId || !style || !content) {
      return res.status(400).json({ error: '参数不完整' });
    }

    if (fromMemberId === toMemberId) {
      return res.status(400).json({ error: '不能给自己写评价' });
    }

    if (content.trim().length < 15) {
      return res.status(400).json({ error: '评价内容至少需要15个字' });
    }

    const room = db.prepare('SELECT status FROM rooms WHERE id = ?').get(roomId) as any;
    if (!room || room.status !== 'active') {
      return res.status(400).json({ error: '房间不存在或已结束' });
    }

    const existing = db.prepare(`
      SELECT id FROM evaluations
      WHERE room_id = ? AND from_member_id = ? AND to_member_id = ?
    `).get(roomId, fromMemberId, toMemberId);

    if (existing) {
      return res.status(400).json({ error: '已经对该成员评价过了' });
    }

    const evalId = uuidv4();
    db.prepare(`
      INSERT INTO evaluations (id, room_id, from_member_id, to_member_id, style, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(evalId, roomId, fromMemberId, toMemberId, style, content.trim());

    res.json({ success: true, evaluationId: evalId });
  } catch (error) {
    console.error('提交评价失败:', error);
    res.status(500).json({ error: '提交评价失败' });
  }
});

app.get('/api/rooms/:code/evaluations', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { memberId } = req.query;

    const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as any;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const members = db.prepare('SELECT * FROM members WHERE room_id = ?').all(room.id) as any[];

    const evaluations = db.prepare(`
      SELECT id, to_member_id, style, content, created_at
      FROM evaluations
      WHERE room_id = ?
    `).all(room.id) as any[];

    const evaluatedByMember: Record<string, string[]> = {};
    if (memberId) {
      const myEvals = db.prepare(`
        SELECT to_member_id FROM evaluations
        WHERE room_id = ? AND from_member_id = ?
      `).all(room.id, memberId) as any[];
      evaluatedByMember[memberId as string] = myEvals.map(e => e.to_member_id);
    }

    const evaluationsByMember: Record<string, Array<{ style: string; content: string }>> = {};
    members.forEach(m => { evaluationsByMember[m.id] = []; });
    evaluations.forEach(e => {
      if (evaluationsByMember[e.to_member_id]) {
        evaluationsByMember[e.to_member_id].push({ style: e.style, content: e.content });
      }
    });

    const wordFreqByMember: Record<string, any> = {};
    members.forEach(m => {
      wordFreqByMember[m.id] = calculateWordFrequency(evaluationsByMember[m.id]);
    });

    const memberEvalCount: Record<string, number> = {};
    evaluations.forEach(e => {
      memberEvalCount[e.from_member_id] = (memberEvalCount[e.from_member_id] || 0) + 1;
    });

    const totalPossible = members.length * (members.length - 1);
    const isComplete = evaluations.length >= totalPossible || room.status === 'ended';

    res.json({
      room,
      members,
      evaluations,
      evaluationsByMember,
      wordFreqByMember,
      evaluatedByMember,
      memberEvalCount,
      isComplete,
      totalEvaluations: evaluations.length,
      totalPossible
    });
  } catch (error) {
    console.error('获取评价数据失败:', error);
    res.status(500).json({ error: '获取评价数据失败' });
  }
});

app.post('/api/rooms/:code/end', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { creatorId } = req.body;

    const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as any;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    if (room.creator_id !== creatorId) {
      return res.status(403).json({ error: '只有创建者可以结束评价' });
    }

    db.prepare("UPDATE rooms SET status = 'ended' WHERE id = ?").run(room.id);

    res.json({ success: true });
  } catch (error) {
    console.error('结束房间失败:', error);
    res.status(500).json({ error: '结束房间失败' });
  }
});

app.get('/api/rooms/:code/export/csv', (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as any;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const members = db.prepare('SELECT * FROM members WHERE room_id = ?').all(room.id) as any[];
    const memberMap: Record<string, string> = {};
    members.forEach(m => { memberMap[m.id] = m.name; });

    const evaluations = db.prepare(`
      SELECT to_member_id, style, content, created_at
      FROM evaluations WHERE room_id = ?
    `).all(room.id) as any[];

    const styleNames: Record<string, string> = {
      encourage: '鼓励型',
      constructive: '建设型',
      humorous: '幽默型'
    };

    let csv = '评价对象,评价风格,评价内容,评价时间\n';
    evaluations.forEach(e => {
      csv += `"${memberMap[e.to_member_id] || '未知'}","${styleNames[e.style] || e.style}","${e.content.replace(/"/g, '""')}","${e.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="evaluation_${code}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('导出CSV失败:', error);
    res.status(500).json({ error: '导出CSV失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
});
