const express = require('express');
const router = express.Router();
const db = require('../database');

const USER_ID = 1;

router.get('/courses', (req, res) => {
  const progress = db.prepare(`
    SELECT 
      c.id as course_id,
      c.title,
      (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = c.id) as total_chapters,
      (SELECT COUNT(*) FROM user_progress up 
       WHERE up.course_id = c.id AND up.chapter_id IS NOT NULL AND up.completed = 1 AND up.user_id = ?) as completed_chapters,
      CASE 
        WHEN (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = c.id) > 0 
        AND (SELECT COUNT(*) FROM user_progress up 
             WHERE up.course_id = c.id AND up.chapter_id IS NOT NULL AND up.completed = 1 AND up.user_id = ?) 
            = (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = c.id)
        THEN 1
        ELSE 0
      END as is_completed,
      (SELECT AVG(score) FROM user_progress up 
       WHERE up.course_id = c.id AND up.chapter_id IS NOT NULL AND up.completed = 1 AND up.user_id = ?) as avg_score
    FROM courses c
    ORDER BY c.created_at DESC
  `).all(USER_ID, USER_ID, USER_ID);

  const result = progress.map(p => ({
    ...p,
    progress: p.total_chapters > 0 ? Math.round((p.completed_chapters / p.total_chapters) * 100) : 0,
    avg_score: p.avg_score ? Math.round(p.avg_score) : null
  }));

  res.json(result);
});

router.get('/courses/:courseId', (req, res) => {
  const courseId = req.params.courseId;

  const progress = db.prepare(`
    SELECT 
      up.*,
      ch.title as chapter_title,
      ch.sort_order
    FROM user_progress up
    LEFT JOIN chapters ch ON ch.id = up.chapter_id
    WHERE up.user_id = ? AND up.course_id = ? AND up.chapter_id IS NOT NULL
    ORDER BY ch.sort_order ASC
  `).all(USER_ID, courseId);

  res.json(progress);
});

router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM chapters) as total_chapters,
      (SELECT COUNT(DISTINCT course_id) FROM user_progress 
       WHERE user_id = ? AND completed = 1 AND chapter_id IS NOT NULL
       GROUP BY course_id
       HAVING COUNT(*) = (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = user_progress.course_id)
      ) as completed_courses_count,
      (SELECT COUNT(*) FROM user_progress WHERE user_id = ? AND completed = 1 AND chapter_id IS NOT NULL) as completed_chapters_count,
      (SELECT AVG(score) FROM user_progress WHERE user_id = ? AND completed = 1 AND chapter_id IS NOT NULL) as avg_score
    FROM (SELECT 1)
  `).get(USER_ID, USER_ID, USER_ID);

  res.json(stats);
});

router.post('/reset/:courseId', (req, res) => {
  const courseId = req.params.courseId;
  
  db.prepare(`
    DELETE FROM user_progress 
    WHERE user_id = ? AND course_id = ? AND chapter_id IS NOT NULL
  `).run(USER_ID, courseId);

  res.json({ message: 'Progress reset successfully' });
});

router.get('/admin/stats', (req, res) => {
  const userProgress = db.prepare(`
    SELECT 
      c.id as course_id,
      c.title as course_title,
      c.instructor,
      (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = c.id) as total_chapters,
      COUNT(DISTINCT up.user_id) as enrolled_users,
      AVG(CASE WHEN up.completed = 1 AND up.chapter_id IS NOT NULL THEN up.score END) as avg_score
    FROM courses c
    LEFT JOIN user_progress up ON up.course_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();

  const overallStats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM chapters) as total_chapters,
      (SELECT COUNT(*) FROM questions) as total_questions,
      (SELECT COUNT(DISTINCT user_id) FROM user_progress) as total_users
    FROM (SELECT 1)
  `).get();

  res.json({
    overall: overallStats,
    courses: userProgress
  });
});

module.exports = router;
