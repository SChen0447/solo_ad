const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let books = [
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    coverUrl: '',
    totalPages: 191,
    currentPage: 150,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    coverUrl: '',
    totalPages: 302,
    currentPage: 200,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    coverUrl: '',
    totalPages: 360,
    currentPage: 100,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    title: '小王子',
    author: '安托万·德·圣-埃克苏佩里',
    coverUrl: '',
    totalPages: 97,
    currentPage: 97,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let notes = [
  {
    id: uuidv4(),
    bookId: books[0].id,
    content: '# 读书笔记\n\n人是为活着本身而活着的，而不是为了活着之外的任何事物所活着。\n\n这句话太深刻了！',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    bookId: books[0].id,
    content: '## 关于苦难\n\n福贵的一生充满了苦难，但他依然坚强地活着。这种对生命的执着令人感动。',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    bookId: books[1].id,
    content: '# 三体感想\n\n黑暗森林法则让人不寒而栗。宇宙就是一座黑暗森林，每个文明都是带枪的猎人。',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    bookId: books[1].id,
    content: '## 技术与人性\n\n科学的边界在哪里？当技术发展到一定程度，人类该如何自处？这是一个值得深思的问题。',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const { title, author, coverUrl, totalPages, currentPage } = req.body;
  const newBook = {
    id: uuidv4(),
    title,
    author,
    coverUrl: coverUrl || '',
    totalPages: parseInt(totalPages),
    currentPage: parseInt(currentPage) || 0,
    createdAt: new Date().toISOString()
  };
  books.unshift(newBook);
  res.status(201).json(newBook);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(book);
});

app.put('/api/books/:id', (req, res) => {
  const bookIndex = books.findIndex(b => b.id === req.params.id);
  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const { title, author, coverUrl, totalPages, currentPage } = req.body;
  books[bookIndex] = {
    ...books[bookIndex],
    title: title !== undefined ? title : books[bookIndex].title,
    author: author !== undefined ? author : books[bookIndex].author,
    coverUrl: coverUrl !== undefined ? coverUrl : books[bookIndex].coverUrl,
    totalPages: totalPages !== undefined ? parseInt(totalPages) : books[bookIndex].totalPages,
    currentPage: currentPage !== undefined ? parseInt(currentPage) : books[bookIndex].currentPage
  };
  res.json(books[bookIndex]);
});

app.get('/api/books/:id/notes', (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const bookNotes = notes
    .filter(n => n.bookId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const paginatedNotes = bookNotes.slice(startIndex, endIndex);
  res.json({
    notes: paginatedNotes,
    total: bookNotes.length,
    page,
    limit,
    hasMore: endIndex < bookNotes.length
  });
});

app.post('/api/books/:id/notes', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const newNote = {
    id: uuidv4(),
    bookId: id,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  notes.unshift(newNote);
  res.status(201).json(newNote);
});

app.put('/api/notes/:id', (req, res) => {
  const noteIndex = notes.findIndex(n => n.id === req.params.id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  const { content } = req.body;
  notes[noteIndex] = {
    ...notes[noteIndex],
    content,
    updatedAt: new Date().toISOString()
  };
  res.json(notes[noteIndex]);
});

app.delete('/api/notes/:id', (req, res) => {
  const noteIndex = notes.findIndex(n => n.id === req.params.id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  notes.splice(noteIndex, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
