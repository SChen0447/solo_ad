const express = require('express');
const cors = require('cors');
const { presetBooks } = require('./seed');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/books', (req, res) => {
  res.json(presetBooks.slice(0, 10));
});

app.get('/api/allbooks', (req, res) => {
  res.json(presetBooks);
});

app.get('/api/recommend', (req, res) => {
  const tagsParam = req.query.tags;
  const existingIds = req.query.excludeIds
    ? (Array.isArray(req.query.excludeIds) ? req.query.excludeIds : String(req.query.excludeIds).split(','))
    : [];

  const fisherYatesShuffle = (arr) => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  if (!tagsParam || (Array.isArray(tagsParam) && tagsParam.length === 0) || String(tagsParam).trim() === '') {
    const candidates = presetBooks.filter(book => !existingIds.includes(book.id));
    if (candidates.length === 0) {
      const shuffled = fisherYatesShuffle(presetBooks);
      return res.json(shuffled[0]);
    }
    const shuffled = fisherYatesShuffle(candidates);
    return res.json(shuffled[0]);
  }

  const tags = Array.isArray(tagsParam) ? tagsParam : String(tagsParam).split(',');
  const candidates = presetBooks.filter(book => !existingIds.includes(book.id));

  if (candidates.length === 0) {
    return res.status(404).json({ error: '没有找到符合条件的推荐书籍' });
  }

  const scored = candidates.map(book => {
    let score = 0;
    for (const tag of tags) {
      if (book.tags.includes(tag)) {
        score += 1;
      }
    }
    return { book, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const maxScore = scored[0].score;
  const topCandidates = scored.filter(s => s.score === maxScore).map(s => s.book);
  const shuffledTop = fisherYatesShuffle(topCandidates);
  const chosen = shuffledTop[0];

  res.json(chosen);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
