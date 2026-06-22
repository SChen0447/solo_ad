import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const books = [
  {
    id: '1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    totalPages: 360,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20book%20cover%20for%20One%20Hundred%20Years%20of%20Solitude%2C%20magical%20realism%20style%2C%20vibrant%20tropical%20colors%2C%20mysterious%20jungle%20and%20butterflies&image_size=portrait_4_3',
    currentPage: 120,
  },
  {
    id: '2',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    totalPages: 440,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20Sapiens%20A%20Brief%20History%20of%20Humankind%2C%20modern%20minimalist%20style%2C%20human%20evolution%20silhouette%2C%20warm%20earth%20tones&image_size=portrait_4_3',
    currentPage: 0,
  },
  {
    id: '3',
    title: '小王子',
    author: '安托万·圣埃克苏佩里',
    totalPages: 96,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Little%20Prince%2C%20watercolor%20illustration%20style%2C%20starlit%20night%20sky%2C%20small%20planet%20with%20rose%2C%20dreamy%20blue%20and%20gold&image_size=portrait_4_3',
    currentPage: 96,
  },
  {
    id: '4',
    title: '三体',
    author: '刘慈欣',
    totalPages: 302,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Three-Body%20Problem%2C%20sci-fi%20style%2C%20three%20suns%20in%20sky%2C%20dark%20cosmic%20background%2C%20cold%20blue%20and%20red%20palette&image_size=portrait_4_3',
    currentPage: 45,
  },
  {
    id: '5',
    title: '月亮与六便士',
    author: '毛姆',
    totalPages: 280,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Moon%20and%20Sixpence%2C%20impressionist%20painting%20style%2C%20Tahiti%20landscape%2C%20warm%20sunset%20colors%2C%20artistic%20brushstrokes&image_size=portrait_4_3',
    currentPage: 200,
  },
];

const excerpts = [
  {
    id: uuidv4(),
    bookId: '1',
    bookTitle: '百年孤独',
    page: 89,
    text: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。',
    note: '开篇之句，时空交错的叙事手法令人叹为观止。一个下午折射出整个家族的命运。',
    likes: 24,
    liked: false,
    comments: [{ id: uuidv4(), user: '书虫小明', content: '这句话真的是文学史上最伟大的开篇之一' }],
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: uuidv4(),
    bookId: '3',
    bookTitle: '小王子',
    page: 42,
    text: '只有用心灵才能看清事物的本质，真正重要的东西是肉眼无法看见的。',
    note: '每次读到这里都会停下来思考，什么是真正重要的东西？我们是不是常常被表象迷惑。',
    likes: 56,
    liked: false,
    comments: [
      { id: uuidv4(), user: '星空漫步', content: '小王子最经典的一句话' },
      { id: uuidv4(), user: '阅读者Lucy', content: '长大后更需要记住这句话' },
    ],
    createdAt: '2024-02-20T14:20:00Z',
  },
  {
    id: uuidv4(),
    bookId: '4',
    bookTitle: '三体',
    page: 156,
    text: '给岁月以文明，而不是给文明以岁月。',
    note: '大刘对文明存续的深刻思考，生命的意义不在长短而在质量。',
    likes: 38,
    liked: false,
    comments: [{ id: uuidv4(), user: '科幻迷老张', content: '三体里最有哲理的一句话' }],
    createdAt: '2024-03-10T09:15:00Z',
  },
  {
    id: uuidv4(),
    bookId: '5',
    bookTitle: '月亮与六便士',
    page: 78,
    text: '我用尽了全力，过着平凡的一生。',
    note: '看似矛盾，实则深刻。大多数人拼尽全力，不过是维持着普通的生活。但也许平凡本身就需要勇气。',
    likes: 42,
    liked: false,
    comments: [],
    createdAt: '2024-03-25T16:45:00Z',
  },
];

app.get('/api/books', (req, res) => {
  const { q } = req.query;
  let result = books;
  if (q && typeof q === 'string') {
    const keyword = q.toLowerCase();
    result = books.filter(
      (b) =>
        b.title.toLowerCase().includes(keyword) ||
        b.author.toLowerCase().includes(keyword)
    );
  }
  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(book);
});

app.put('/api/books/:id/progress', (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const { currentPage } = req.body;
  if (typeof currentPage !== 'number' || currentPage < 0 || currentPage > book.totalPages) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  book.currentPage = currentPage;
  res.json(book);
});

app.get('/api/excerpts', (req, res) => {
  res.json(excerpts);
});

app.post('/api/excerpts', (req, res) => {
  const { bookId, bookTitle, page, text, note } = req.body;
  if (!bookId || !bookTitle || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (text.length > 300) {
    return res.status(400).json({ error: 'Excerpt text exceeds 300 characters' });
  }
  const newExcerpt = {
    id: uuidv4(),
    bookId,
    bookTitle,
    page: page || 0,
    text,
    note: note || '',
    likes: 0,
    liked: false,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  excerpts.unshift(newExcerpt);
  res.status(201).json(newExcerpt);
});

app.post('/api/excerpts/:id/like', (req, res) => {
  const excerpt = excerpts.find((e) => e.id === req.params.id);
  if (!excerpt) {
    return res.status(404).json({ error: 'Excerpt not found' });
  }
  excerpt.liked = !excerpt.liked;
  excerpt.likes += excerpt.liked ? 1 : -1;
  res.json(excerpt);
});

app.post('/api/excerpts/:id/comments', (req, res) => {
  const excerpt = excerpts.find((e) => e.id === req.params.id);
  if (!excerpt) {
    return res.status(404).json({ error: 'Excerpt not found' });
  }
  const { user, content } = req.body;
  if (!user || !content) {
    return res.status(400).json({ error: 'Missing user or content' });
  }
  const newComment = { id: uuidv4(), user, content };
  excerpt.comments.push(newComment);
  res.status(201).json(newComment);
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
