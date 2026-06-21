import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data.db'));

export interface Skill {
  id: number;
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'testing' | 'devops';
}

export interface MemberSkill {
  skillId: number;
  skillName: string;
  category: string;
  proficiency: number;
  lastUpdated: string;
}

export interface Project {
  id: number;
  name: string;
  role: string;
}

export interface Member {
  id: number;
  name: string;
  avatar: string;
  skills: MemberSkill[];
  projects: Project[];
  currentProjectCount: number;
}

export interface ProjectRequirement {
  id: number;
  name: string;
  skills: { skillId: number; minProficiency: number; weight: number }[];
}

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('frontend', 'backend', 'database', 'testing', 'devops'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS member_skills (
    member_id INTEGER,
    skill_id INTEGER,
    proficiency INTEGER NOT NULL CHECK(proficiency BETWEEN 0 AND 100),
    last_updated TEXT NOT NULL,
    PRIMARY KEY (member_id, skill_id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS project_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requirement_skills (
    requirement_id INTEGER,
    skill_id INTEGER,
    min_proficiency INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    PRIMARY KEY (requirement_id, skill_id),
    FOREIGN KEY (requirement_id) REFERENCES project_requirements(id),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
  );
`);

const insertSkill = db.prepare('INSERT OR IGNORE INTO skills (name, category) VALUES (?, ?)');
const insertMember = db.prepare('INSERT OR IGNORE INTO members (id, name, avatar) VALUES (?, ?, ?)');
const insertMemberSkill = db.prepare('INSERT OR REPLACE INTO member_skills (member_id, skill_id, proficiency, last_updated) VALUES (?, ?, ?, ?)');
const insertProject = db.prepare('INSERT OR IGNORE INTO projects (id, member_id, name, role) VALUES (?, ?, ?, ?)');

const skillsData = [
  { name: 'React', category: 'frontend' },
  { name: 'Vue', category: 'frontend' },
  { name: 'TypeScript', category: 'frontend' },
  { name: 'CSS', category: 'frontend' },
  { name: 'Node.js', category: 'backend' },
  { name: 'Python', category: 'backend' },
  { name: 'Java', category: 'backend' },
  { name: 'Go', category: 'backend' },
  { name: 'MySQL', category: 'database' },
  { name: 'PostgreSQL', category: 'database' },
  { name: 'MongoDB', category: 'database' },
  { name: 'Redis', category: 'database' },
  { name: 'Jest', category: 'testing' },
  { name: 'Cypress', category: 'testing' },
  { name: 'Selenium', category: 'testing' },
  { name: 'Docker', category: 'devops' },
  { name: 'Kubernetes', category: 'devops' },
  { name: 'AWS', category: 'devops' },
  { name: 'CI/CD', category: 'devops' },
];

skillsData.forEach(s => insertSkill.run(s.name, s.category));

const membersData = [
  {
    id: 1,
    name: '张三',
    skills: [
      { skillId: 1, proficiency: 90 },
      { skillId: 3, proficiency: 85 },
      { skillId: 4, proficiency: 80 },
      { skillId: 5, proficiency: 60 },
      { skillId: 13, proficiency: 70 },
    ],
    projects: [
      { id: 1, name: '电商平台', role: '前端负责人' },
      { id: 2, name: '管理后台', role: '前端开发' },
    ]
  },
  {
    id: 2,
    name: '李四',
    skills: [
      { skillId: 5, proficiency: 95 },
      { skillId: 6, proficiency: 75 },
      { skillId: 9, proficiency: 85 },
      { skillId: 12, proficiency: 70 },
      { skillId: 16, proficiency: 65 },
    ],
    projects: [
      { id: 3, name: 'API网关', role: '后端负责人' },
      { id: 1, name: '电商平台', role: '后端开发' },
    ]
  },
  {
    id: 3,
    name: '王五',
    skills: [
      { skillId: 2, proficiency: 88 },
      { skillId: 3, proficiency: 92 },
      { skillId: 4, proficiency: 85 },
      { skillId: 14, proficiency: 78 },
      { skillId: 13, proficiency: 72 },
    ],
    projects: [
      { id: 4, name: '移动端H5', role: '前端负责人' },
      { id: 2, name: '管理后台', role: '前端开发' },
    ]
  },
  {
    id: 4,
    name: '赵六',
    skills: [
      { skillId: 7, proficiency: 90 },
      { skillId: 10, proficiency: 85 },
      { skillId: 11, proficiency: 80 },
      { skillId: 17, proficiency: 60 },
      { skillId: 18, proficiency: 55 },
    ],
    projects: [
      { id: 5, name: '企业级ERP', role: '后端负责人' },
      { id: 3, name: 'API网关', role: '后端开发' },
    ]
  },
  {
    id: 5,
    name: '钱七',
    skills: [
      { skillId: 16, proficiency: 92 },
      { skillId: 17, proficiency: 88 },
      { skillId: 18, proficiency: 85 },
      { skillId: 19, proficiency: 90 },
      { skillId: 12, proficiency: 75 },
    ],
    projects: [
      { id: 6, name: '云平台建设', role: '运维负责人' },
      { id: 5, name: '企业级ERP', role: '运维支持' },
    ]
  },
  {
    id: 6,
    name: '孙八',
    skills: [
      { skillId: 13, proficiency: 95 },
      { skillId: 14, proficiency: 90 },
      { skillId: 15, proficiency: 82 },
      { skillId: 1, proficiency: 65 },
      { skillId: 3, proficiency: 70 },
    ],
    projects: [
      { id: 7, name: '自动化测试平台', role: '测试负责人' },
      { id: 4, name: '移动端H5', role: '测试工程师' },
    ]
  },
];

const now = new Date().toISOString();

membersData.forEach(member => {
  insertMember.run(member.id, member.name, member.name.charAt(0));
  member.skills.forEach(skill => {
    insertMemberSkill.run(member.id, skill.skillId, skill.proficiency, now);
  });
  member.projects.forEach(project => {
    insertProject.run(project.id, member.id, project.name, project.role);
  });
});

export const getSkills = db.prepare(`
  SELECT id, name, category FROM skills ORDER BY category, name
`);

export const getMembers = db.prepare(`
  SELECT m.id, m.name, m.avatar,
         COUNT(DISTINCT p.id) as currentProjectCount
  FROM members m
  LEFT JOIN projects p ON m.id = p.member_id
  GROUP BY m.id
`);

export const getMemberSkills = db.prepare(`
  SELECT s.id as skillId, s.name as skillName, s.category,
         ms.proficiency, ms.last_updated as lastUpdated
  FROM member_skills ms
  JOIN skills s ON ms.skill_id = s.id
  WHERE ms.member_id = ?
  ORDER BY ms.proficiency DESC
`);

export const getMemberProjects = db.prepare(`
  SELECT p.id, p.name, p.role
  FROM projects p
  WHERE p.member_id = ?
`);

export const getMemberById = (id: number): Member | null => {
  const memberRow = db.prepare('SELECT id, name, avatar FROM members WHERE id = ?').get(id) as { id: number; name: string; avatar: string } | undefined;
  if (!memberRow) return null;

  const skills = getMemberSkills.all(id) as MemberSkill[];
  const projects = getMemberProjects.all(id) as Project[];
  const projectCount = (db.prepare('SELECT COUNT(*) as count FROM projects WHERE member_id = ?').get(id) as { count: number }).count;

  return {
    ...memberRow,
    skills,
    projects,
    currentProjectCount: projectCount
  };
};

export const getAllMembers = (): Member[] => {
  const members = getMembers.all() as { id: number; name: string; avatar: string; currentProjectCount: number }[];
  return members.map(m => ({
    ...m,
    skills: getMemberSkills.all(m.id) as MemberSkill[],
    projects: getMemberProjects.all(m.id) as Project[]
  }));
};

export const createProjectRequirement = (name: string, skills: { skillId: number; minProficiency: number; weight: number }[]): number => {
  const tx = db.transaction((reqName: string, skillList: typeof skills) => {
    const result = db.prepare('INSERT INTO project_requirements (name) VALUES (?)').run(reqName);
    const reqId = result.lastInsertRowid as number;
    const insertReqSkill = db.prepare('INSERT INTO requirement_skills (requirement_id, skill_id, min_proficiency, weight) VALUES (?, ?, ?, ?)');
    skillList.forEach(s => insertReqSkill.run(reqId, s.skillId, s.minProficiency, s.weight));
    return reqId;
  });
  return tx(name, skills);
};

export const calculateMatch = (requirementId: number) => {
  const reqSkills = db.prepare(`
    SELECT skill_id, min_proficiency, weight
    FROM requirement_skills
    WHERE requirement_id = ?
  `).all(requirementId) as { skill_id: number; min_proficiency: number; weight: number }[];

  const totalWeight = reqSkills.reduce((sum, s) => sum + s.weight, 0);
  const members = getAllMembers();

  return members.map(member => {
    let weightedScore = 0;
    let meetsRequirements = true;

    reqSkills.forEach(reqSkill => {
      const memberSkill = member.skills.find(s => s.skillId === reqSkill.skill_id);
      const proficiency = memberSkill?.proficiency || 0;
      
      if (proficiency < reqSkill.min_proficiency) {
        meetsRequirements = false;
      }
      
      const normalizedScore = Math.min(proficiency, 100) / 100;
      weightedScore += normalizedScore * reqSkill.weight;
    });

    const matchPercentage = Math.round((weightedScore / totalWeight) * 100);

    return {
      memberId: member.id,
      memberName: member.name,
      matchPercentage,
      meetsRequirements,
      details: reqSkills.map(reqSkill => {
        const memberSkill = member.skills.find(s => s.skillId === reqSkill.skill_id);
        const skill = db.prepare('SELECT name, category FROM skills WHERE id = ?').get(reqSkill.skill_id) as { name: string; category: string };
        return {
          skillName: skill.name,
          category: skill.category,
          required: reqSkill.min_proficiency,
          actual: memberSkill?.proficiency || 0,
          weight: reqSkill.weight
        };
      })
    };
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);
};

export default db;
