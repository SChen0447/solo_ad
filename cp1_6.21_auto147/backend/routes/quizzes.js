const express = require('express');
const router = express.Router();
const db = require('../database');

const USER_ID = 1;

router.get('/:courseId', (req, res) => {
  const courseId = req.params.courseId;
  const { chapterId } = req.query;

  let quiz;
  if (chapterId) {
    quiz = db.prepare('SELECT * FROM quizzes WHERE course_id = ? AND chapter_id = ?').get(courseId, chapterId);
  } else {
    quiz = db.prepare('SELECT * FROM quizzes WHERE course_id = ? ORDER BY id ASC LIMIT 1').get(courseId);
  }

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const questions = db.prepare(`
    SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order ASC
  `).all(quiz.id);

  const questionsWithOptions = questions.map(q => {
    const options = db.prepare(`
      SELECT * FROM options WHERE question_id = ? ORDER BY sort_order ASC
    `).all(q.id);
    return { ...q, options };
  });

  res.json({
    ...quiz,
    questions: questionsWithOptions
  });
});

router.post('/:courseId', (req, res) => {
  const courseId = req.params.courseId;
  const { chapterId, answers } = req.body;

  let quiz;
  if (chapterId) {
    quiz = db.prepare('SELECT * FROM quizzes WHERE course_id = ? AND chapter_id = ?').get(courseId, chapterId);
  } else {
    quiz = db.prepare('SELECT * FROM quizzes WHERE course_id = ? ORDER BY id ASC LIMIT 1').get(courseId);
  }

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const questions = db.prepare(`
    SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order ASC
  `).all(quiz.id);

  let score = 0;
  const results = [];

  questions.forEach(q => {
    const correctOptions = db.prepare(`
      SELECT id FROM options WHERE question_id = ? AND is_correct = 1
    `).all(q.id).map(o => o.id);

    const userAnswer = answers[q.id] || [];
    const userAnswerIds = Array.isArray(userAnswer) ? userAnswer : [userAnswer];

    const correctIdsSet = new Set(correctOptions.map(String));
    const userIdsSet = new Set(userAnswerIds.map(String));

    let isCorrect = false;
    if (q.question_type === 'single') {
      isCorrect = correctIdsSet.has(String(userAnswerIds[0]));
    } else {
      isCorrect = correctIdsSet.size === userIdsSet.size &&
        [...correctIdsSet].every(id => userIdsSet.has(id));
    }

    if (isCorrect) score++;

    results.push({
      question_id: q.id,
      is_correct: isCorrect ? 1 : 0,
      correct_options: correctOptions,
      user_answer: userAnswerIds
    });
  });

  if (quiz.chapter_id) {
    const existing = db.prepare(`
      SELECT * FROM user_progress 
      WHERE user_id = ? AND course_id = ? AND chapter_id = ?
    `).get(USER_ID, courseId, quiz.chapter_id);

    if (existing) {
      db.prepare(`
        UPDATE user_progress 
        SET completed = 1, score = ?, total_questions = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(score, questions.length, existing.id);
    } else {
      db.prepare(`
        INSERT INTO user_progress (user_id, course_id, chapter_id, completed, score, total_questions, completed_at)
        VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
      `).run(USER_ID, courseId, quiz.chapter_id, score, questions.length);
    }
  }

  res.json({
    score,
    total_questions: questions.length,
    percentage: Math.round((score / questions.length) * 100),
    results
  });
});

router.post('/', (req, res) => {
  const { course_id, chapter_id, title } = req.body;

  if (!course_id) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  const result = db.prepare(`
    INSERT INTO quizzes (course_id, chapter_id, title)
    VALUES (?, ?, ?)
  `).run(course_id, chapter_id || null, title || '测验');

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(quiz);
});

router.put('/:quizId', (req, res) => {
  const quizId = req.params.quizId;
  const { title } = req.body;

  const existing = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  if (!existing) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.prepare('UPDATE quizzes SET title = ? WHERE id = ?').run(
    title || existing.title,
    quizId
  );

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  res.json(quiz);
});

router.delete('/:quizId', (req, res) => {
  const quizId = req.params.quizId;
  
  const result = db.prepare('DELETE FROM quizzes WHERE id = ?').run(quizId);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  res.json({ message: 'Quiz deleted successfully' });
});

router.post('/:quizId/questions', (req, res) => {
  const quizId = req.params.quizId;
  const { question_text, question_type, options } = req.body;

  if (!question_text) {
    return res.status(400).json({ error: 'Question text is required' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM questions WHERE quiz_id = ?').get(quizId);
  const sortOrder = (maxOrder?.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO questions (quiz_id, question_text, question_type, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(quizId, question_text, question_type || 'single', sortOrder);

  const questionId = result.lastInsertRowid;

  if (options && options.length > 0) {
    options.forEach((opt, idx) => {
      db.prepare(`
        INSERT INTO options (question_id, option_text, is_correct, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(questionId, opt.text, opt.is_correct ? 1 : 0, idx);
    });
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  const questionOptions = db.prepare('SELECT * FROM options WHERE question_id = ? ORDER BY sort_order ASC').all(questionId);

  res.status(201).json({ ...question, options: questionOptions });
});

router.put('/questions/:questionId', (req, res) => {
  const questionId = req.params.questionId;
  const { question_text, question_type, options } = req.body;

  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!existing) {
    return res.status(404).json({ error: 'Question not found' });
  }

  db.prepare(`
    UPDATE questions SET question_text = ?, question_type = ? WHERE id = ?
  `).run(
    question_text || existing.question_text,
    question_type || existing.question_type,
    questionId
  );

  if (options && options.length > 0) {
    db.prepare('DELETE FROM options WHERE question_id = ?').run(questionId);
    options.forEach((opt, idx) => {
      db.prepare(`
        INSERT INTO options (question_id, option_text, is_correct, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(questionId, opt.text, opt.is_correct ? 1 : 0, idx);
    });
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  const questionOptions = db.prepare('SELECT * FROM options WHERE question_id = ? ORDER BY sort_order ASC').all(questionId);

  res.json({ ...question, options: questionOptions });
});

router.delete('/questions/:questionId', (req, res) => {
  const questionId = req.params.questionId;
  
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Question not found' });
  }

  res.json({ message: 'Question deleted successfully' });
});

module.exports = router;
