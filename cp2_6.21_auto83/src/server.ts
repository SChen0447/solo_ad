import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Instrument, Evaluation, InstrumentInput, EvaluationInput } from './types';

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

const categories = ['吉他', '架子鼓', '钢琴', '小提琴', '萨克斯', '电子琴', '贝斯', '尤克里里'];
const brandsByCategory: Record<string, string[]> = {
  '吉他': ['Fender', 'Gibson', 'Yamaha', 'Ibanez', 'Taylor', 'Martin'],
  '架子鼓': ['Pearl', 'Yamaha', 'Tama', 'Ludwig', 'DW', 'Mapex'],
  '钢琴': ['Yamaha', 'Kawai', 'Roland', 'Casio', 'Steinway', 'Bosendorfer'],
  '小提琴': ['Stradivari', 'Yamaha', 'Stentor', 'Knilling', 'Cecilio', 'Mendini'],
  '萨克斯': ['Yamaha', 'Selmer', 'Keilwerth', 'Yanagisawa', 'Buffet', 'Jupiter'],
  '电子琴': ['Roland', 'Yamaha', 'Korg', 'Casio', 'Nord', 'Moog'],
  '贝斯': ['Fender', 'Music Man', 'Ibanez', 'Yamaha', 'Gibson', 'Spector'],
  '尤克里里': ['Kala', 'Ohana', 'Cordoba', 'Lanikai', 'Kamaka', 'KoAloha'],
};

const conditions: ('全新' | '9成新' | '8成新')[] = ['全新', '9成新', '8成新'];

const generateMockEvaluations = (count: number): Evaluation[] => {
  const comments = [
    '音色很棒，手感也不错，值得入手！',
    '成色很新，卖家描述真实，推荐！',
    '性价比很高，初学者完全够用。',
    '用了一段时间，各方面都满意。',
    '做工精细，品牌的品质有保障。',
    '声音干净通透，很喜欢。',
    '外观漂亮，手感舒适，好评！',
    '比想象中好，配件齐全。',
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    rating: Math.floor(Math.random() * 2) + 4,
    content: comments[Math.floor(Math.random() * comments.length)],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

const generateMockInstruments = (): Instrument[] => {
  const instruments: Instrument[] = [];
  
  for (let i = 0; i < 40; i++) {
    const category = categories[i % categories.length];
    const brands = brandsByCategory[category];
    const brand = brands[i % brands.length];
    const condition = conditions[i % 3];
    const price = Math.floor(Math.random() * 8000) + 500;
    const evalCount = Math.floor(Math.random() * 5) + 1;
    
    instruments.push({
      id: uuidv4(),
      name: `${brand} ${category} ${i + 1}号`,
      brand,
      category,
      condition,
      price,
      images: [
        `https://picsum.photos/seed/instr${i}a/600/400`,
        `https://picsum.photos/seed/instr${i}b/600/400`,
        `https://picsum.photos/seed/instr${i}c/600/400`,
      ],
      description: `这是一款来自${brand}的${category}，${condition}，品质优良，音色出色。适合初学者和进阶玩家使用，配件齐全，性价比高。`,
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      evaluations: generateMockEvaluations(evalCount),
    });
  }
  
  return instruments.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

let instruments: Instrument[] = generateMockInstruments();

app.get('/api/instruments', (req: Request, res: Response) => {
  const { category, brand, minPrice, maxPrice } = req.query;
  
  let filtered = [...instruments];
  
  if (category && category !== '全部') {
    filtered = filtered.filter(i => i.category === category);
  }
  
  if (brand && brand !== '全部') {
    filtered = filtered.filter(i => i.brand === brand);
  }
  
  if (minPrice) {
    filtered = filtered.filter(i => i.price >= Number(minPrice));
  }
  
  if (maxPrice) {
    filtered = filtered.filter(i => i.price <= Number(maxPrice));
  }
  
  const result = filtered.map(instr => {
    const { evaluations, ...rest } = instr;
    const avgRating = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + e.rating, 0) / evaluations.length
      : 0;
    return {
      ...rest,
      avgRating: Math.round(avgRating * 10) / 10,
      evaluationCount: evaluations.length,
    };
  });
  
  res.json(result);
});

app.get('/api/instruments/:id', (req: Request, res: Response) => {
  const instrument = instruments.find(i => i.id === req.params.id);
  
  if (!instrument) {
    return res.status(404).json({ error: 'Instrument not found' });
  }
  
  const sortedEvaluations = [...instrument.evaluations].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  res.json({
    ...instrument,
    evaluations: sortedEvaluations,
  });
});

app.post('/api/instruments/:id/evaluations', (req: Request, res: Response) => {
  const instrument = instruments.find(i => i.id === req.params.id);
  
  if (!instrument) {
    return res.status(404).json({ error: 'Instrument not found' });
  }
  
  const { rating, content } = req.body as EvaluationInput;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid rating' });
  }
  
  if (!content || content.length > 200) {
    return res.status(400).json({ error: 'Invalid content' });
  }
  
  const newEvaluation: Evaluation = {
    id: uuidv4(),
    rating,
    content,
    createdAt: new Date().toISOString(),
  };
  
  instrument.evaluations.push(newEvaluation);
  
  res.status(201).json(newEvaluation);
});

app.post('/api/instruments', (req: Request, res: Response) => {
  const { name, brand, category, condition, price, images, description } = req.body as InstrumentInput;
  
  if (!name || !brand || !category || !condition || !price || !images || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const newInstrument: Instrument = {
    id: uuidv4(),
    name,
    brand,
    category,
    condition,
    price: Number(price),
    images,
    description,
    createdAt: new Date().toISOString(),
    evaluations: [],
  };
  
  instruments.unshift(newInstrument);
  
  res.status(201).json(newInstrument);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
