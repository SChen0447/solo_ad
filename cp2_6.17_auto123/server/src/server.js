import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const users = {};
const cards = {};

app.post('/api/register', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const existingUser = Object.values(users).find(u => u.username === username);
    if (existingUser) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const userId = uuidv4();
    const user = {
      id: userId,
      username,
      password,
      name: '',
      position: '',
      company: '',
      email: '',
      phone: '',
      avatarUrl: '',
      socialLinks: {
        wechat: '',
        linkedin: '',
        twitter: '',
        github: ''
      },
      createdAt: new Date().toISOString()
    };

    users[userId] = user;
    cards[userId] = [];

    res.status(201).json({
      id: userId,
      username: user.username,
      name: user.name,
      position: user.position,
      company: user.company,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      socialLinks: user.socialLinks
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = Object.values(users).find(u => u.username === username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      position: user.position,
      company: user.company,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      socialLinks: user.socialLinks
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = users[userId];

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      id: user.id,
      name: user.name,
      position: user.position,
      company: user.company,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      socialLinks: user.socialLinks
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.put('/api/profile', (req, res) => {
  try {
    const { userId, name, position, company, email, phone, avatarUrl, socialLinks } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    const user = users[userId];
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (name !== undefined) user.name = name;
    if (position !== undefined) user.position = position;
    if (company !== undefined) user.company = company;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (socialLinks !== undefined) {
      user.socialLinks = { ...user.socialLinks, ...socialLinks };
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      position: user.position,
      company: user.company,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      socialLinks: user.socialLinks
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/cards', (req, res) => {
  try {
    const { userId, page = 1, pageSize = 20, search = '', sort = 'date_desc' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    const userCards = cards[userId] || [];
    let filteredCards = [...userCards];

    if (search) {
      const searchLower = String(search).toLowerCase();
      filteredCards = filteredCards.filter(card =>
        card.name.toLowerCase().includes(searchLower) ||
        card.company.toLowerCase().includes(searchLower) ||
        card.position.toLowerCase().includes(searchLower)
      );
    }

    if (sort === 'date_desc') {
      filteredCards.sort((a, b) => new Date(b.exchangedAt) - new Date(a.exchangedAt));
    } else if (sort === 'date_asc') {
      filteredCards.sort((a, b) => new Date(a.exchangedAt) - new Date(b.exchangedAt));
    } else if (sort === 'name_asc') {
      filteredCards.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'name_desc') {
      filteredCards.sort((a, b) => b.name.localeCompare(a.name));
    }

    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const start = (pageNum - 1) * pageSizeNum;
    const end = start + pageSizeNum;
    const paginatedCards = filteredCards.slice(start, end);

    res.json({
      cards: paginatedCards,
      total: filteredCards.length,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: end < filteredCards.length
    });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/exchange', (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;

    if (!fromUserId || !toUserId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: '不能与自己交换名片' });
    }

    const fromUser = users[fromUserId];
    const toUser = users[toUserId];

    if (!fromUser || !toUser) {
      return res.status(404).json({ error: '无效的用户ID' });
    }

    if (!cards[fromUserId]) cards[fromUserId] = [];
    if (!cards[toUserId]) cards[toUserId] = [];

    const fromHasTo = cards[fromUserId].some(c => c.id === toUserId);
    const toHasFrom = cards[toUserId].some(c => c.id === fromUserId);

    if (fromHasTo && toHasFrom) {
      return res.status(409).json({ error: '已经交换过名片' });
    }

    const now = new Date().toISOString();

    if (!fromHasTo) {
      cards[fromUserId].push({
        id: toUser.id,
        name: toUser.name,
        position: toUser.position,
        company: toUser.company,
        email: toUser.email,
        phone: toUser.phone,
        avatarUrl: toUser.avatarUrl,
        socialLinks: toUser.socialLinks,
        note: '',
        exchangedAt: now
      });
    }

    if (!toHasFrom) {
      cards[toUserId].push({
        id: fromUser.id,
        name: fromUser.name,
        position: fromUser.position,
        company: fromUser.company,
        email: fromUser.email,
        phone: fromUser.phone,
        avatarUrl: fromUser.avatarUrl,
        socialLinks: fromUser.socialLinks,
        note: '',
        exchangedAt: now
      });
    }

    res.status(201).json({ message: '名片交换成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.delete('/api/cards/:cardId', (req, res) => {
  try {
    const { userId } = req.query;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    if (!cards[userId]) {
      return res.status(404).json({ error: '名片夹不存在' });
    }

    const cardIndex = cards[userId].findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return res.status(404).json({ error: '名片不存在' });
    }

    cards[userId].splice(cardIndex, 1);
    res.json({ message: '名片删除成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.put('/api/cards/:cardId/note', (req, res) => {
  try {
    const { userId, note } = req.body;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    if (!cards[userId]) {
      return res.status(404).json({ error: '名片夹不存在' });
    }

    const card = cards[userId].find(c => c.id === cardId);
    if (!card) {
      return res.status(404).json({ error: '名片不存在' });
    }

    card.note = note || '';
    res.json({ message: '备注更新成功', note: card.note });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: '数字名片 API 服务运行中' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
