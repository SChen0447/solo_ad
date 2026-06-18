import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Meeting {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  isClosed: boolean;
}

interface Idea {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  votes: number;
  createdAt: string;
  votedBy: string[];
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let meetings: Meeting[] = [];
let ideas: Idea[] = [];

app.get('/api/meetings', (req, res) => {
  res.json(meetings);
});

app.get('/api/meetings/:id', (req, res) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  const meetingIdeas = ideas.filter(i => i.meetingId === req.params.id);
  res.json({ ...meeting, ideas: meetingIdeas });
});

app.post('/api/meetings', (req, res) => {
  const { title, description, deadline } = req.body;
  
  if (!title || title.length > 30) {
    return res.status(400).json({ error: '会议标题不能为空且最多30个字符' });
  }
  
  const newMeeting: Meeting = {
    id: uuidv4(),
    title,
    description: description || '',
    deadline,
    createdAt: new Date().toISOString(),
    isClosed: false,
  };
  
  meetings.unshift(newMeeting);
  res.status(201).json(newMeeting);
});

app.post('/api/meetings/:id/close', (req, res) => {
  const meetingIndex = meetings.findIndex(m => m.id === req.params.id);
  if (meetingIndex === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  meetings[meetingIndex].isClosed = true;
  res.json(meetings[meetingIndex]);
});

app.get('/api/meetings/:id/ideas', (req, res) => {
  const { id } = req.params;
  const meetingIdeas = ideas.filter(i => i.meetingId === id);
  res.json(meetingIdeas);
});

app.post('/api/meetings/:id/ideas', (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  
  const meeting = meetings.find(m => m.id === id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  if (meeting.isClosed) {
    return res.status(400).json({ error: '会议已关闭，无法添加新点子' });
  }
  
  if (!title || title.length > 60) {
    return res.status(400).json({ error: '点子标题不能为空且最多60个字符' });
  }
  
  if (description && description.length > 200) {
    return res.status(400).json({ error: '说明文字最多200个字符' });
  }
  
  const newIdea: Idea = {
    id: uuidv4(),
    meetingId: id,
    title,
    description: description || '',
    votes: 0,
    createdAt: new Date().toISOString(),
    votedBy: [],
  };
  
  ideas.push(newIdea);
  res.status(201).json(newIdea);
});

app.post('/api/ideas/:id/vote', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  const ideaIndex = ideas.findIndex(i => i.id === id);
  if (ideaIndex === -1) {
    return res.status(404).json({ error: '点子不存在' });
  }
  
  const idea = ideas[ideaIndex];
  const meeting = meetings.find(m => m.id === idea.meetingId);
  
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  if (meeting.isClosed) {
    return res.status(400).json({ error: '会议已关闭，无法投票' });
  }
  
  if (idea.votedBy.includes(userId)) {
    return res.status(400).json({ error: '您已经为这个点子投过票了' });
  }
  
  const userVotesInMeeting = ideas.filter(
    i => i.meetingId === idea.meetingId && i.votedBy.includes(userId)
  ).length;
  
  if (userVotesInMeeting >= 5) {
    return res.status(400).json({ error: '您在本会议中已达到5票上限' });
  }
  
  ideas[ideaIndex].votes += 1;
  ideas[ideaIndex].votedBy.push(userId);
  
  res.json(ideas[ideaIndex]);
});

app.get('/api/meetings/:id/voters', (req, res) => {
  const { id } = req.params;
  const meetingIdeas = ideas.filter(i => i.meetingId === id);
  const allVoters = new Set<string>();
  meetingIdeas.forEach(idea => {
    idea.votedBy.forEach(voter => allVoters.add(voter));
  });
  res.json({ voterCount: allVoters.size });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
