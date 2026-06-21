const express = require('express');
const router = express.Router();
const db = require('../database');

const USER_ID = 1;

router.get('/', (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = c.id) as total_chapters,
      (SELECT COUNT(*) FROM user_progress up 
       WHERE up.course_id = c.id AND up.chapter_id IS NOT NULL AND up.completed = 1 AND up.user_id = ?) as completed_chapters
    FROM courses c
    ORDER BY c.created_at DESC
  `).all(USER_ID);

  const result = courses.map(c => ({
    ...c,
    progress: c.total_chapters > 0 ? Math.round((c.completed_chapters / c.total_chapters) * 100) : 0,
    is_completed: c.completed_chapters > 0 && c.completed_chapters === c.total_chapters
  }));

  res.json(result);
});

router.get('/:id', (req, res) => {
  const courseId = req.params.id;
  
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const chapters = db.prepare(`
    SELECT ch.*, 
      CASE WHEN up.completed = 1 THEN 1 ELSE 0 END as is_completed,
      up.score,
      up.total_questions
    FROM chapters ch
    LEFT JOIN user_progress up 
      ON up.chapter_id = ch.id AND up.course_id = ch.course_id AND up.user_id = ?
    WHERE ch.course_id = ?
    ORDER BY ch.sort_order ASC
  `).all(USER_ID, courseId);

  const totalChapters = chapters.length;
  const completedChapters = chapters.filter(ch => ch.is_completed === 1).length;

  res.json({
    ...course,
    chapters,
    total_chapters: totalChapters,
    completed_chapters: completedChapters,
    progress: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
  });
});

router.post('/', (req, res) => {
  const { title, description, instructor, video_url, thumbnail } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db.prepare(`
    INSERT INTO courses (title, description, instructor, video_url, thumbnail)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, description || '', instructor || '', video_url || '', thumbnail || '');

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(course);
});

router.put('/:id', (req, res) => {
  const courseId = req.params.id;
  const { title, description, instructor, video_url, thumbnail } = req.body;

  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!existing) {
    return res.status(404).json({ error: 'Course not found' });
  }

  db.prepare(`
    UPDATE courses 
    SET title = ?, description = ?, instructor = ?, video_url = ?, thumbnail = ?
    WHERE id = ?
  `).run(
    title || existing.title,
    description !== undefined ? description : existing.description,
    instructor !== undefined ? instructor : existing.instructor,
    video_url !== undefined ? video_url : existing.video_url,
    thumbnail !== undefined ? thumbnail : existing.thumbnail,
    courseId
  );

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  res.json(course);
});

router.delete('/:id', (req, res) => {
  const courseId = req.params.id;
  
  const result = db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json({ message: 'Course deleted successfully' });
});

router.get('/:id/chapters', (req, res) => {
  const courseId = req.params.id;
  
  const chapters = db.prepare(`
    SELECT * FROM chapters WHERE course_id = ? ORDER BY sort_order ASC
  `).all(courseId);

  res.json(chapters);
});

router.post('/:id/chapters', (req, res) => {
  const courseId = req.params.id;
  const { title, duration, video_start_time, quiz_id } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM chapters WHERE course_id = ?').get(courseId);
  const sortOrder = (maxOrder?.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO chapters (course_id, title, duration, video_start_time, quiz_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(courseId, title, duration || '', video_start_time || 0, quiz_id || null, sortOrder);

  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(chapter);
});

router.put('/chapters/:chapterId', (req, res) => {
  const chapterId = req.params.chapterId;
  const { title, duration, video_start_time, quiz_id, sort_order } = req.body;

  const existing = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
  if (!existing) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  db.prepare(`
    UPDATE chapters 
    SET title = ?, duration = ?, video_start_time = ?, quiz_id = ?, sort_order = ?
    WHERE id = ?
  `).run(
    title || existing.title,
    duration !== undefined ? duration : existing.duration,
    video_start_time !== undefined ? video_start_time : existing.video_start_time,
    quiz_id !== undefined ? quiz_id : existing.quiz_id,
    sort_order !== undefined ? sort_order : existing.sort_order,
    chapterId
  );

  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
  res.json(chapter);
});

router.delete('/chapters/:chapterId', (req, res) => {
  const chapterId = req.params.chapterId;
  
  const result = db.prepare('DELETE FROM chapters WHERE id = ?').run(chapterId);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  res.json({ message: 'Chapter deleted successfully' });
});

module.exports = router;
