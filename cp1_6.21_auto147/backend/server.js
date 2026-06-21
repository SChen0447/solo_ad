const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./database');

const coursesRouter = require('./routes/courses');
const quizzesRouter = require('./routes/quizzes');
const progressRouter = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/courses', coursesRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/progress', progressRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Learning Platform API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

module.exports = app;
