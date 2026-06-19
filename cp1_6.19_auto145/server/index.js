import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const skills = [
  { id: 's1', name: 'React', description: '前端UI框架，用于构建用户界面组件' },
  { id: 's2', name: 'Python', description: '高级编程语言，用于数据科学、后端开发' },
  { id: 's3', name: 'Docker', description: '容器化技术，用于应用部署与管理' },
  { id: 's4', name: 'TypeScript', description: 'JavaScript超集，提供类型系统' },
  { id: 's5', name: 'Node.js', description: '服务端JavaScript运行时环境' },
  { id: 's6', name: 'MongoDB', description: 'NoSQL文档型数据库' },
  { id: 's7', name: 'AWS', description: '亚马逊云服务，云计算平台' },
  { id: 's8', name: 'Git', description: '分布式版本控制系统' }
];

const members = [
  { id: 'm1', name: '张伟', avatar: 'ZW', email: 'zhangwei@team.com', phone: '138-0001' },
  { id: 'm2', name: '李娜', avatar: 'LN', email: 'lina@team.com', phone: '138-0002' },
  { id: 'm3', name: '王强', avatar: 'WQ', email: 'wangqiang@team.com', phone: '138-0003' },
  { id: 'm4', name: '刘敏', avatar: 'LM', email: 'liumin@team.com', phone: '138-0004' },
  { id: 'm5', name: '陈浩', avatar: 'CH', email: 'chenhao@team.com', phone: '138-0005' },
  { id: 'm6', name: '杨丽', avatar: 'YL', email: 'yangli@team.com', phone: '138-0006' }
];

const skillScores = {};
const notesPool = [
  '熟悉常用API', '项目实战经验丰富', '了解基础概念',
  '主导过多个项目', '正在学习中', '精通底层原理',
  '有2年经验', '参与过大型项目', '自学入门阶段'
];

members.forEach(member => {
  skillScores[member.id] = {};
  skills.forEach(skill => {
    const score = Math.floor(Math.random() * 5) + 1;
    const noteIndex = Math.floor(Math.random() * notesPool.length);
    skillScores[member.id][skill.id] = {
      score,
      note: notesPool[noteIndex],
      updatedAt: new Date().toISOString()
    };
  });
});

app.get('/api/skills', (req, res) => {
  res.json({ skills });
});

app.get('/api/members', (req, res) => {
  res.json({ members });
});

app.get('/api/scores', (req, res) => {
  res.json({ skillScores });
});

app.get('/api/all', (req, res) => {
  res.json({ skills, members, skillScores });
});

app.put('/api/score/:memberId/:skillId', (req, res) => {
  const { memberId, skillId } = req.params;
  const { score, note } = req.body;

  if (!skillScores[memberId] || !skillScores[memberId][skillId]) {
    return res.status(404).json({ error: '未找到对应技能评分' });
  }

  if (score < 1 || score > 5) {
    return res.status(400).json({ error: '分数必须在1-5之间' });
  }

  skillScores[memberId][skillId] = {
    score,
    note: note || skillScores[memberId][skillId].note,
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: skillScores[memberId][skillId]
  });
});

app.post('/api/recommendations/:memberId', (req, res) => {
  const { memberId } = req.params;

  if (!skillScores[memberId]) {
    return res.status(404).json({ error: '未找到成员' });
  }

  const memberScores = skillScores[memberId];
  const sortedSkills = skills
    .map(skill => ({
      skill,
      score: memberScores[skill.id].score
    }))
    .sort((a, b) => a.score - b.score);

  const weakestSkills = sortedSkills.slice(0, 2);

  const recommendations = weakestSkills.map(item => {
    const bestMember = members
      .filter(m => m.id !== memberId)
      .map(m => ({
        member: m,
        score: skillScores[m.id][item.skill.id].score
      }))
      .sort((a, b) => b.score - a.score)[0];

    const matchScore = Math.round(
      ((bestMember.score - item.score) / 5) * 60 +
      ((5 - Math.abs(bestMember.score - item.score)) / 5) * 40
    );

    return {
      id: uuidv4(),
      skill: item.skill,
      currentScore: item.score,
      partner: bestMember.member,
      partnerScore: bestMember.score,
      matchScore: Math.min(matchScore, 98)
    };
  });

  res.json({ recommendations });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
