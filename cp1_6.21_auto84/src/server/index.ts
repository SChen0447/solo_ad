import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, type Inquiry, type Quote } from './dataStore.js';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

app.get('/api/portfolio', (req, res) => {
  const data = readData();
  res.json(data.portfolio);
});

app.post('/api/inquiry', (req, res) => {
  const data = readData();
  const { name, email, requirements, budgetRange, timeline, portfolioId } = req.body;

  if (!name || !email || !requirements) {
    return res.status(400).json({ error: '请填写必填项' });
  }

  const inquiryNumber = `INQ-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const newInquiry: Inquiry = {
    id: uuidv4(),
    inquiryNumber,
    name,
    email,
    requirements,
    budgetRange: budgetRange || '',
    timeline: timeline || '',
    status: 'unread',
    createdAt: new Date().toISOString(),
    portfolioId,
  };

  data.inquiries.unshift(newInquiry);
  writeData(data);

  io.emit('new-inquiry', newInquiry);

  res.status(201).json({
    success: true,
    inquiryNumber,
    inquiry: newInquiry,
  });
});

app.get('/api/inquiries', (req, res) => {
  const data = readData();
  res.json(data.inquiries);
});

app.get('/api/inquiries/:id', (req, res) => {
  const data = readData();
  const inquiry = data.inquiries.find((i) => i.id === req.params.id);

  if (!inquiry) {
    return res.status(404).json({ error: '询价不存在' });
  }

  const quotes = data.quotes.filter((q) => q.inquiryId === req.params.id);

  res.json({
    inquiry,
    quotes,
  });
});

app.put('/api/inquiries/:id/read', (req, res) => {
  const data = readData();
  const inquiryIndex = data.inquiries.findIndex((i) => i.id === req.params.id);

  if (inquiryIndex === -1) {
    return res.status(404).json({ error: '询价不存在' });
  }

  if (data.inquiries[inquiryIndex].status === 'unread') {
    data.inquiries[inquiryIndex].status = 'read';
    writeData(data);
    io.emit('inquiry-updated', data.inquiries[inquiryIndex]);
  }

  res.json(data.inquiries[inquiryIndex]);
});

app.post('/api/quote', (req, res) => {
  const data = readData();
  const { inquiryId, price, deliveryTime, description } = req.body;

  if (!inquiryId || !price || !deliveryTime) {
    return res.status(400).json({ error: '请填写必填项' });
  }

  const inquiryIndex = data.inquiries.findIndex((i) => i.id === inquiryId);
  if (inquiryIndex === -1) {
    return res.status(404).json({ error: '询价不存在' });
  }

  const newQuote: Quote = {
    id: uuidv4(),
    inquiryId,
    price,
    deliveryTime,
    description: description || '',
    createdAt: new Date().toISOString(),
  };

  data.quotes.push(newQuote);
  data.inquiries[inquiryIndex].status = 'quoted';
  writeData(data);

  io.emit('inquiry-updated', data.inquiries[inquiryIndex]);
  io.emit('new-quote', { quote: newQuote, inquiry: data.inquiries[inquiryIndex] });

  res.status(201).json({
    success: true,
    quote: newQuote,
  });
});

app.post('/api/inquiries/:id/respond', (req, res) => {
  const data = readData();
  const { accepted } = req.body;
  const inquiryIndex = data.inquiries.findIndex((i) => i.id === req.params.id);

  if (inquiryIndex === -1) {
    return res.status(404).json({ error: '询价不存在' });
  }

  data.inquiries[inquiryIndex].status = accepted ? 'accepted' : 'rejected';
  writeData(data);

  io.emit('inquiry-updated', data.inquiries[inquiryIndex]);

  res.json({
    success: true,
    inquiry: data.inquiries[inquiryIndex],
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket ready`);
});
