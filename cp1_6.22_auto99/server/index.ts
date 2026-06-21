import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type SkillCategory = 'frontend' | 'backend' | 'devops' | 'data' | 'design' | 'management';

interface Skill {
  name: string;
  category: SkillCategory;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  level: 'junior' | 'senior';
  skills: Skill[];
}

interface Course {
  id: string;
  title: string;
  duration: number;
  difficulty: 'low' | 'medium' | 'high';
  targetSkill: string;
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
}

interface LearningPath {
  employeeId: string;
  courses: Course[];
  milestones: Milestone[];
}

interface Progress {
  employeeId: string;
  skills: number;
  courseCompletion: number;
  testScore: number;
  attendance: number;
}

const employees: Map<string, Employee> = new Map();
const courses: Map<string, Course> = new Map();
const learningPaths: Map<string, LearningPath> = new Map();
const progressData: Map<string, Progress> = new Map();

const positionRequiredSkills: Record<string, Skill[]> = {
  '前端工程师': [
    { name: 'React', category: 'frontend' },
    { name: 'TypeScript', category: 'frontend' },
    { name: 'CSS', category: 'frontend' },
    { name: '性能优化', category: 'frontend' },
  ],
  '后端工程师': [
    { name: 'Node.js', category: 'backend' },
    { name: '数据库', category: 'backend' },
    { name: 'API设计', category: 'backend' },
    { name: '微服务', category: 'backend' },
  ],
  'DevOps工程师': [
    { name: 'Docker', category: 'devops' },
    { name: 'Kubernetes', category: 'devops' },
    { name: 'CI/CD', category: 'devops' },
    { name: '监控告警', category: 'devops' },
  ],
  '数据分析师': [
    { name: 'SQL', category: 'data' },
    { name: 'Python', category: 'data' },
    { name: '数据可视化', category: 'data' },
    { name: '机器学习', category: 'data' },
  ],
  '产品经理': [
    { name: '需求分析', category: 'management' },
    { name: '项目管理', category: 'management' },
    { name: '用户研究', category: 'design' },
    { name: '数据分析', category: 'data' },
  ],
};

const allCourses: Course[] = [
  { id: 'c1', title: 'React高级实战', duration: 20, difficulty: 'high', targetSkill: 'React' },
  { id: 'c2', title: 'TypeScript入门到精通', duration: 15, difficulty: 'medium', targetSkill: 'TypeScript' },
  { id: 'c3', title: 'CSS布局与动画', duration: 10, difficulty: 'low', targetSkill: 'CSS' },
  { id: 'c4', title: '前端性能优化', duration: 18, difficulty: 'high', targetSkill: '性能优化' },
  { id: 'c5', title: 'Node.js企业级开发', duration: 25, difficulty: 'high', targetSkill: 'Node.js' },
  { id: 'c6', title: '数据库设计与优化', duration: 20, difficulty: 'medium', targetSkill: '数据库' },
  { id: 'c7', title: 'RESTful API设计', duration: 12, difficulty: 'medium', targetSkill: 'API设计' },
  { id: 'c8', title: '微服务架构实践', duration: 30, difficulty: 'high', targetSkill: '微服务' },
  { id: 'c9', title: 'Docker容器化部署', duration: 15, difficulty: 'medium', targetSkill: 'Docker' },
  { id: 'c10', title: 'Kubernetes集群管理', duration: 25, difficulty: 'high', targetSkill: 'Kubernetes' },
  { id: 'c11', title: 'CI/CD流水线搭建', duration: 18, difficulty: 'medium', targetSkill: 'CI/CD' },
  { id: 'c12', title: 'Prometheus监控实战', duration: 16, difficulty: 'medium', targetSkill: '监控告警' },
  { id: 'c13', title: 'SQL进阶查询', duration: 12, difficulty: 'medium', targetSkill: 'SQL' },
  { id: 'c14', title: 'Python数据分析', duration: 22, difficulty: 'medium', targetSkill: 'Python' },
  { id: 'c15', title: '数据可视化入门', duration: 10, difficulty: 'low', targetSkill: '数据可视化' },
  { id: 'c16', title: '机器学习基础', duration: 35, difficulty: 'high', targetSkill: '机器学习' },
  { id: 'c17', title: '需求分析方法论', duration: 8, difficulty: 'low', targetSkill: '需求分析' },
  { id: 'c18', title: '敏捷项目管理', duration: 14, difficulty: 'medium', targetSkill: '项目管理' },
  { id: 'c19', title: '用户研究与访谈', duration: 10, difficulty: 'low', targetSkill: '用户研究' },
  { id: 'c20', title: '业务数据分析', duration: 16, difficulty: 'medium', targetSkill: '数据分析' },
];

allCourses.forEach((c) => courses.set(c.id, c));

const firstNames = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '朱', '马', '胡'];
const lastNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '超', '秀英', '霞', '平', '刚', '桂英'];
const positions = ['前端工程师', '后端工程师', 'DevOps工程师', '数据分析师', '产品经理'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return shuffled.slice(0, count);
}

for (let i = 1; i <= 120; i++) {
  const position = randomChoice(positions);
  const requiredSkills = positionRequiredSkills[position] || [];
  const level = Math.random() > 0.5 ? 'senior' : 'junior';
  const skillCount = level === 'senior' ? Math.floor(requiredSkills.length * 0.7) : Math.floor(requiredSkills.length * 0.4);
  const employeeSkills = randomSubset(requiredSkills, Math.max(1, skillCount), skillCount);

  const employee: Employee = {
    id: uuidv4(),
    name: randomChoice(firstNames) + randomChoice(lastNames),
    position,
    level,
    skills: employeeSkills,
  };
  employees.set(employee.id, employee);

  progressData.set(employee.id, {
    employeeId: employee.id,
    skills: Math.floor(Math.random() * 40) + 40,
    courseCompletion: Math.floor(Math.random() * 50) + 30,
    testScore: Math.floor(Math.random() * 40) + 45,
    attendance: Math.floor(Math.random() * 30) + 60,
  });
}

app.get('/api/employees', (_req, res) => {
  const list = Array.from(employees.values());
  res.json(list);
});

app.post('/api/recommend', (req, res) => {
  const { employeeId } = req.body;
  const employee = employees.get(employeeId);
  if (!employee) {
    return res.status(404).json({ error: '员工不存在' });
  }

  const requiredSkills = positionRequiredSkills[employee.position] || [];
  const existingSkillNames = new Set(employee.skills.map((s) => s.name));
  const missingSkills = requiredSkills.filter((s) => !existingSkillNames.has(s.name));

  const recommendedCourses: Course[] = [];
  for (const skill of missingSkills) {
    const match = allCourses.find((c) => c.targetSkill === skill.name);
    if (match) {
      recommendedCourses.push(match);
    }
  }

  if (recommendedCourses.length < 3) {
    const extras = allCourses
      .filter((c) => !recommendedCourses.find((r) => r.id === c.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - recommendedCourses.length);
    recommendedCourses.push(...extras);
  }

  const finalCourses = recommendedCourses.slice(0, 5);

  const milestones: Milestone[] = [
    { id: uuidv4(), name: '开启', dueDate: '', completed: false },
    { id: uuidv4(), name: '中期', dueDate: '', completed: false },
    { id: uuidv4(), name: '完成', dueDate: '', completed: false },
  ];

  learningPaths.set(employeeId, {
    employeeId,
    courses: finalCourses,
    milestones,
  });

  res.json({ courses: finalCourses, milestones });
});

app.post('/api/save-plan', (req, res) => {
  const { employeeId, courses: planCourses, milestones: planMilestones } = req.body;
  learningPaths.set(employeeId, {
    employeeId,
    courses: planCourses,
    milestones: planMilestones,
  });
  res.json({ success: true });
});

app.post('/api/milestone/complete', (req, res) => {
  const { employeeId, milestoneId } = req.body;
  const path = learningPaths.get(employeeId);
  if (!path) {
    return res.status(404).json({ error: '学习路径不存在' });
  }
  const milestone = path.milestones.find((m) => m.id === milestoneId);
  if (milestone) {
    milestone.completed = true;
  }
  const progress = progressData.get(employeeId);
  if (progress) {
    progress.courseCompletion = Math.min(100, progress.courseCompletion + 20);
    progress.skills = Math.min(100, progress.skills + 10);
  }
  res.json({ success: true });
});

app.get('/api/progress/:id', (req, res) => {
  const { id } = req.params;
  const progress = progressData.get(id);
  const employee = employees.get(id);
  if (!progress || !employee) {
    return res.status(404).json({ error: '进度数据不存在' });
  }
  res.json({
    employeeName: employee.name,
    ...progress,
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
