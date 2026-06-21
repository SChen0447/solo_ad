const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'learning.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      instructor TEXT,
      video_url TEXT,
      thumbnail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration TEXT,
      video_start_time INTEGER DEFAULT 0,
      quiz_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      chapter_id INTEGER,
      title TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'single',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      course_id INTEGER NOT NULL,
      chapter_id INTEGER,
      completed INTEGER DEFAULT 0,
      score INTEGER,
      total_questions INTEGER,
      completed_at DATETIME,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(user_id, course_id, chapter_id)
    );
  `);
}

function seedData() {
  const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
  if (courseCount > 0) return;

  const insertCourse = db.prepare(`
    INSERT INTO courses (title, description, instructor, video_url, thumbnail)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertChapter = db.prepare(`
    INSERT INTO chapters (course_id, title, duration, video_start_time, quiz_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertQuiz = db.prepare(`
    INSERT INTO quizzes (course_id, chapter_id, title)
    VALUES (?, ?, ?)
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO questions (quiz_id, question_text, question_type, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertOption = db.prepare(`
    INSERT INTO options (question_id, option_text, is_correct, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const courses = [
    {
      title: 'React 基础入门',
      description: '从零开始学习React框架，掌握组件化开发思想，理解JSX语法、状态管理和生命周期。适合前端初学者快速上手现代Web开发。',
      instructor: '张老师',
      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnail: ''
    },
    {
      title: 'TypeScript 进阶指南',
      description: '深入学习TypeScript类型系统，掌握泛型、装饰器、命名空间等高级特性，提升代码质量和开发效率。',
      instructor: '李老师',
      video_url: 'https://www.youtube.com/embed/BwuLxPH8IDs',
      thumbnail: ''
    },
    {
      title: 'Node.js 后端开发',
      description: '使用Node.js构建高性能后端服务，学习Express框架、数据库操作、API设计等核心技能。',
      instructor: '王老师',
      video_url: 'https://www.youtube.com/embed/TlB_eWDSMt4',
      thumbnail: ''
    },
    {
      title: '数据库设计与优化',
      description: '学习关系型数据库设计原理，掌握SQL查询优化、索引设计、事务处理等关键技术。',
      instructor: '赵老师',
      video_url: 'https://www.youtube.com/embed/HXV3zeQKqGY',
      thumbnail: ''
    },
    {
      title: '软件测试基础',
      description: '全面了解软件测试方法论，学习单元测试、集成测试、自动化测试等实践技能。',
      instructor: '陈老师',
      video_url: 'https://www.youtube.com/embed/7kL78c_6J2M',
      thumbnail: ''
    },
    {
      title: '项目管理实务',
      description: '学习敏捷开发方法论，掌握项目规划、进度跟踪、团队协作等项目管理核心能力。',
      instructor: '刘老师',
      video_url: 'https://www.youtube.com/embed/8hP9D6kZseM',
      thumbnail: ''
    }
  ];

  const chaptersData = [
    ['课程介绍与环境搭建', '10:00', 0],
    ['JSX语法详解', '15:30', 600],
    ['组件与Props', '20:00', 1530],
    ['状态管理useState', '18:45', 2730],
    ['useEffect与生命周期', '22:00', 3855]
  ];

  const quizQuestions = [
    {
      text: 'React中用于管理组件状态的Hook是？',
      type: 'single',
      options: [
        { text: 'useEffect', correct: false },
        { text: 'useState', correct: true },
        { text: 'useContext', correct: false },
        { text: 'useRef', correct: false }
      ]
    },
    {
      text: '以下哪些是React的特性？',
      type: 'multiple',
      options: [
        { text: '虚拟DOM', correct: true },
        { text: '组件化开发', correct: true },
        { text: '双向数据绑定', correct: false },
        { text: '单向数据流', correct: true }
      ]
    },
    {
      text: 'JSX最终会被编译成什么？',
      type: 'single',
      options: [
        { text: 'HTML字符串', correct: false },
        { text: 'JavaScript对象', correct: true },
        { text: 'CSS样式', correct: false },
        { text: 'JSON数据', correct: false }
      ]
    },
    {
      text: '关于Props的说法正确的是？',
      type: 'multiple',
      options: [
        { text: 'Props是只读的', correct: true },
        { text: 'Props可以从父组件传递到子组件', correct: true },
        { text: 'Props可以直接修改', correct: false },
        { text: 'Props可以传递函数', correct: true }
      ]
    },
    {
      text: 'useEffect的依赖数组为空时，何时执行？',
      type: 'single',
      options: [
        { text: '每次渲染后', correct: false },
        { text: '组件挂载时只执行一次', correct: true },
        { text: '从不执行', correct: false },
        { text: '组件卸载时', correct: false }
      ]
    }
  ];

  const transaction = db.transaction(() => {
    courses.forEach((course, courseIdx) => {
      const courseResult = insertCourse.run(
        course.title,
        course.description,
        course.instructor,
        course.video_url,
        course.thumbnail
      );
      const courseId = courseResult.lastInsertRowid;

      chaptersData.forEach((chapter, chapIdx) => {
        const quizResult = insertQuiz.run(courseId, null, `${chapter[0]}测验`);
        const quizId = quizResult.lastInsertRowid;

        const chapterResult = insertChapter.run(
          courseId,
          chapter[0],
          chapter[1],
          chapter[2],
          quizId,
          chapIdx
        );

        db.prepare('UPDATE chapters SET quiz_id = ? WHERE id = ?').run(quizId, chapterResult.lastInsertRowid);
        db.prepare('UPDATE quizzes SET chapter_id = ? WHERE id = ?').run(chapterResult.lastInsertRowid, quizId);

        quizQuestions.forEach((q, qIdx) => {
          const qResult = insertQuestion.run(quizId, q.text, q.type, qIdx);
          const questionId = qResult.lastInsertRowid;

          q.options.forEach((opt, oIdx) => {
            insertOption.run(questionId, opt.text, opt.correct ? 1 : 0, oIdx);
          });
        });
      });
    });
  });

  transaction();
  console.log('Database seeded with sample data.');
}

initDatabase();
seedData();

module.exports = db;
