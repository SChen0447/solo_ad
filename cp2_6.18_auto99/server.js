import express from 'express';
import cors from 'cors';
import {
  getAllCards,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
  getCardsByCategory
} from './data/cards.js';
import {
  getAllFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite
} from './data/favorites.js';

const app = express();
const PORT = 29999;

app.use(cors());
app.use(express.json());

app.get('/api/cards', (req, res) => {
  const { category, keyword } = req.query;
  let cards = getAllCards();

  if (category && category !== 'all') {
    cards = cards.filter(card => card.category === category);
  }

  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    cards = cards.filter(card =>
      card.title.toLowerCase().includes(lowerKeyword) ||
      card.content.toLowerCase().includes(lowerKeyword) ||
      card.category.toLowerCase().includes(lowerKeyword)
    );
  }

  const cardsWithFavorite = cards.map(card => ({
    ...card,
    favorited: isFavorite(card.id)
  }));

  res.json(cardsWithFavorite);
});

app.get('/api/cards/:id', (req, res) => {
  const card = getCardById(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json({
    ...card,
    favorited: isFavorite(card.id)
  });
});

app.post('/api/cards', (req, res) => {
  const { title, category, content, difficulty } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Title, category and content are required' });
  }
  const newCard = createCard({
    title,
    category,
    content,
    difficulty: difficulty || 1
  });
  res.status(201).json({
    ...newCard,
    favorited: false
  });
});

app.put('/api/cards/:id', (req, res) => {
  const { title, category, content, difficulty } = req.body;
  const updatedCard = updateCard(req.params.id, {
    title,
    category,
    content,
    difficulty
  });
  if (!updatedCard) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json({
    ...updatedCard,
    favorited: isFavorite(updatedCard.id)
  });
});

app.delete('/api/cards/:id', (req, res) => {
  const deleted = deleteCard(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json({ success: true });
});

app.get('/api/cards/:id/recommendations', (req, res) => {
  const card = getCardById(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  const sameCategory = getCardsByCategory(card.category)
    .filter(c => c.id !== card.id)
    .slice(0, 5);
  res.json(sameCategory);
});

app.get('/api/favorites', (req, res) => {
  const favIds = getAllFavorites();
  const favCards = getAllCards()
    .filter(card => favIds.includes(card.id))
    .map(card => ({ ...card, favorited: true }));
  res.json(favCards);
});

app.post('/api/favorites/:cardId', (req, res) => {
  const result = addFavorite(req.params.cardId);
  res.json(result);
});

app.delete('/api/favorites/:cardId', (req, res) => {
  const result = removeFavorite(req.params.cardId);
  res.json(result);
});

app.post('/api/favorites/:cardId/toggle', (req, res) => {
  const result = toggleFavorite(req.params.cardId);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
