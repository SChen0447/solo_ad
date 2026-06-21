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
  if (!tagsParam) {
    const randomIdx = Math.floor(Math.random() * presetBooks.length);
    return res.json(presetBooks[randomIdx]);
  }

  const tags = Array.isArray(tagsParam) ? tagsParam : String(tagsParam).split(',');
  const existingIds = req.query.excludeIds ? (Array.isArray(req.query.excludeIds) ? req.query.excludeIds : String(req.query.excludeIds).split(',')) : [];

  const candidates = presetBooks.filter(book => !existingIds.includes(book.id));

  if (candidates.length === 0) {
    const randomIdx = Math.floor(Math.random() * presetBooks.length);
    return res.json(presetBooks[randomIdx]);
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
  const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

  res.json(chosen);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
