import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { store } from './store';
import { generateMatchSuggestions } from './matching';
import type {
  Gift,
  CreateGiftDto,
  AddLogisticsDto,
  LogisticsRecord,
  ExchangeRecord,
} from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

app.get('/api/gifts', (req, res) => {
  const status = req.query.status as string | undefined;
  let gifts = store.getAllGifts();

  if (status) {
    gifts = gifts.filter((g) => g.status === status);
  }

  res.json(gifts);
});

app.get('/api/gifts/:id', (req, res) => {
  const gift = store.getGift(req.params.id);
  if (!gift) {
    res.status(404).json({ error: '礼物不存在' });
    return;
  }
  res.json(gift);
});

app.post('/api/gifts', (req, res) => {
  const dto: CreateGiftDto = req.body;

  if (!dto.name || !dto.photoUrl || !dto.city || !dto.category || !dto.owner) {
    res.status(400).json({ error: '请填写所有必填字段' });
    return;
  }

  if (dto.value <= 0) {
    res.status(400).json({ error: '价值必须大于0' });
    return;
  }

  try {
    new URL(dto.photoUrl);
  } catch {
    res.status(400).json({ error: '照片URL格式不正确' });
    return;
  }

  const gift: Gift = {
    id: uuidv4(),
    name: dto.name,
    photoUrl: dto.photoUrl,
    value: dto.value,
    city: dto.city,
    category: dto.category,
    owner: dto.owner,
    status: 'available',
    createdAt: formatDate(new Date()),
    exchangeHistory: [],
    logistics: [],
  };

  store.addGift(gift);
  res.status(201).json(gift);
});

app.get('/api/matches', (_req, res) => {
  const gifts = store.getAllGifts();
  const suggestions = generateMatchSuggestions(gifts, 5);
  res.json(suggestions);
});

app.post('/api/matches/:matchId/confirm', (req, res) => {
  const { gift1Id, gift2Id } = req.body;

  const gift1 = store.getGift(gift1Id);
  const gift2 = store.getGift(gift2Id);

  if (!gift1 || !gift2) {
    res.status(404).json({ error: '礼物不存在' });
    return;
  }

  if (gift1.status !== 'available' || gift2.status !== 'available') {
    res.status(400).json({ error: '礼物状态不可交换' });
    return;
  }

  store.updateGiftStatus(gift1Id, 'exchanged');
  store.updateGiftStatus(gift2Id, 'exchanged');

  const exchangeRecord: ExchangeRecord = {
    id: uuidv4(),
    giftId: gift1Id,
    partnerGiftId: gift2Id,
    partnerCity: gift2.city,
    partnerOwner: gift2.owner,
    status: 'confirmed',
    createdAt: formatDate(new Date()),
  };

  store.addExchangeRecord(exchangeRecord);

  res.json({ success: true, gift1, gift2 });
});

app.get('/api/gifts/:id/logistics', (req, res) => {
  const records = store.getLogisticsByGiftId(req.params.id);
  res.json(records);
});

app.post('/api/gifts/:id/logistics', (req, res) => {
  const dto: AddLogisticsDto = req.body;
  const giftId = req.params.id;

  const gift = store.getGift(giftId);
  if (!gift) {
    res.status(404).json({ error: '礼物不存在' });
    return;
  }

  if (!dto.company || !dto.trackingNumber || !dto.statusText) {
    res.status(400).json({ error: '请填写所有物流信息字段' });
    return;
  }

  const record: LogisticsRecord = {
    id: uuidv4(),
    giftId,
    company: dto.company,
    trackingNumber: dto.trackingNumber,
    statusText: dto.statusText,
    timestamp: formatDate(new Date()),
  };

  const result = store.addLogisticsRecord(giftId, record);

  if (gift.status === 'exchanged') {
    store.updateGiftStatus(giftId, 'in_transit');
  }

  res.status(201).json(result);
});

app.get('/api/stats', (_req, res) => {
  const stats = store.getStats();
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
