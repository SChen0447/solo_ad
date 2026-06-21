import express from 'express';
import cors from 'cors';
import {
  getSkills,
  getAllMembers,
  getMemberById,
  createProjectRequirement,
  calculateMatch,
  Member,
  Skill
} from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/skills', (_req, res) => {
  const skills = getSkills.all() as Skill[];
  res.json(skills);
});

app.get('/api/members', (_req, res) => {
  const members = getAllMembers();
  res.json(members);
});

app.get('/api/members/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const member = getMemberById(id);
  if (member) {
    res.json(member);
  } else {
    res.status(404).json({ error: 'Member not found' });
  }
});

app.post('/api/project-requirements', (req, res) => {
  try {
    const { name, skills } = req.body;
    if (!name || !skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    const id = createProjectRequirement(name, skills);
    res.json({ id, name, skills });
  } catch (error) {
    console.error('Error creating project requirement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/project-requirements/:id/match', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const results = calculateMatch(id);
    res.json(results);
  } catch (error) {
    console.error('Error calculating match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
