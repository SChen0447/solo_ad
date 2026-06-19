export interface Skill {
  id: string;
  name: string;
  description: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
}

export interface SkillScore {
  score: number;
  note: string;
  updatedAt: string;
}

export type SkillScoresMap = Record<string, Record<string, SkillScore>>;

export interface Recommendation {
  id: string;
  skill: Skill;
  currentScore: number;
  partner: TeamMember;
  partnerScore: number;
  matchScore: number;
}

export const SCORE_COLORS: Record<number, string> = {
  1: '#2b5876',
  2: '#4a6fa5',
  3: '#f6b93b',
  4: '#e58e26',
  5: '#ee5253'
};

export const SCORE_LABELS: Record<number, string> = {
  1: '入门',
  2: '初级',
  3: '中级',
  4: '高级',
  5: '专家'
};

export function getScoreColor(score: number): string {
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  return SCORE_COLORS[clamped];
}

export function getScoreLabel(score: number): string {
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  return SCORE_LABELS[clamped];
}

export function generateRadarGradient(): string[] {
  return ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#fa709a', '#ffecd2', '#fcb69f', '#42e695'];
}

const API_BASE = '/api';

export async function fetchAllData(): Promise<{
  skills: Skill[];
  members: TeamMember[];
  skillScores: SkillScoresMap;
}> {
  try {
    const response = await fetch(`${API_BASE}/all`);
    if (!response.ok) throw new Error('Failed to fetch data');
    return await response.json();
  } catch (error) {
    console.error('Fetch error, using mock data:', error);
    return getMockData();
  }
}

export async function updateScore(
  memberId: string,
  skillId: string,
  score: number,
  note?: string
): Promise<SkillScore | null> {
  try {
    const response = await fetch(`${API_BASE}/score/${memberId}/${skillId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, note })
    });
    if (!response.ok) throw new Error('Failed to update score');
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Update error:', error);
    return null;
  }
}

export async function fetchRecommendations(memberId: string): Promise<Recommendation[]> {
  try {
    const response = await fetch(`${API_BASE}/recommendations/${memberId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    const result = await response.json();
    return result.recommendations;
  } catch (error) {
    console.error('Recommendations error:', error);
    return [];
  }
}

function getMockData(): {
  skills: Skill[];
  members: TeamMember[];
  skillScores: SkillScoresMap;
} {
  const skills: Skill[] = [
    { id: 's1', name: 'React', description: '前端UI框架，用于构建用户界面组件' },
    { id: 's2', name: 'Python', description: '高级编程语言，用于数据科学、后端开发' },
    { id: 's3', name: 'Docker', description: '容器化技术，用于应用部署与管理' },
    { id: 's4', name: 'TypeScript', description: 'JavaScript超集，提供类型系统' },
    { id: 's5', name: 'Node.js', description: '服务端JavaScript运行时环境' },
    { id: 's6', name: 'MongoDB', description: 'NoSQL文档型数据库' },
    { id: 's7', name: 'AWS', description: '亚马逊云服务，云计算平台' },
    { id: 's8', name: 'Git', description: '分布式版本控制系统' }
  ];

  const members: TeamMember[] = [
    { id: 'm1', name: '张伟', avatar: 'ZW', email: 'zhangwei@team.com', phone: '138-0001' },
    { id: 'm2', name: '李娜', avatar: 'LN', email: 'lina@team.com', phone: '138-0002' },
    { id: 'm3', name: '王强', avatar: 'WQ', email: 'wangqiang@team.com', phone: '138-0003' },
    { id: 'm4', name: '刘敏', avatar: 'LM', email: 'liumin@team.com', phone: '138-0004' },
    { id: 'm5', name: '陈浩', avatar: 'CH', email: 'chenhao@team.com', phone: '138-0005' },
    { id: 'm6', name: '杨丽', avatar: 'YL', email: 'yangli@team.com', phone: '138-0006' }
  ];

  const notesPool = [
    '熟悉常用API', '项目实战经验丰富', '了解基础概念',
    '主导过多个项目', '正在学习中', '精通底层原理',
    '有2年经验', '参与过大型项目', '自学入门阶段'
  ];

  const skillScores: SkillScoresMap = {};
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

  return { skills, members, skillScores };
}

export function generateMockRecommendations(
  memberId: string,
  members: TeamMember[],
  skills: Skill[],
  skillScores: SkillScoresMap
): Recommendation[] {
  const memberScores = skillScores[memberId];
  if (!memberScores) return [];

  const sortedSkills = skills
    .map(skill => ({ skill, score: memberScores[skill.id].score }))
    .sort((a, b) => a.score - b.score);

  const weakestSkills = sortedSkills.slice(0, 2);

  return weakestSkills.map(item => {
    const bestMember = members
      .filter(m => m.id !== memberId)
      .map(m => ({ member: m, score: skillScores[m.id][item.skill.id].score }))
      .sort((a, b) => b.score - a.score)[0];

    const matchScore = Math.round(
      ((bestMember.score - item.score) / 5) * 60 +
      ((5 - Math.abs(bestMember.score - item.score)) / 5) * 40
    );

    return {
      id: `rec-${item.skill.id}-${Date.now()}-${Math.random()}`,
      skill: item.skill,
      currentScore: item.score,
      partner: bestMember.member,
      partnerScore: bestMember.score,
      matchScore: Math.min(matchScore, 98)
    };
  });
}
