import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

const readJSON = (file) => {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJSON = (file, data) => {
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

const generateEventsForBand = (band, startDate, endDate) => {
  const events = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    if (current.getDay() === band.schedule.dayOfWeek) {
      const dateStr = current.toISOString().split('T')[0];
      events.push({
        id: uuidv4(),
        bandId: band.id,
        date: dateStr,
        startTime: band.schedule.startTime,
        endTime: band.schedule.endTime,
        location: band.schedule.location,
        confirmedMembers: [],
        createdAt: new Date().toISOString()
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return events;
};

app.get('/api/bands', (req, res) => {
  const bands = readJSON('bands.json');
  const members = readJSON('members.json');
  const bandsWithMembers = bands.map(band => ({
    ...band,
    members: members.filter(m => m.bandId === band.id)
  }));
  res.json(bandsWithMembers);
});

app.post('/api/bands', (req, res) => {
  const bands = readJSON('bands.json');
  const members = readJSON('members.json');
  const events = readJSON('events.json');
  
  const { name, adminEmail, schedule } = req.body;
  const bandId = uuidv4();
  const memberId = uuidv4();
  
  const newBand = {
    id: bandId,
    name,
    adminEmail,
    schedule,
    createdAt: new Date().toISOString()
  };
  
  const adminMember = {
    id: memberId,
    bandId,
    email: adminEmail,
    name: '管理员',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminEmail}`,
    role: 'admin',
    joinedAt: new Date().toISOString()
  };
  
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const newEvents = generateEventsForBand(newBand, new Date(), threeMonthsLater);
  
  bands.push(newBand);
  members.push(adminMember);
  events.push(...newEvents);
  
  writeJSON('bands.json', bands);
  writeJSON('members.json', members);
  writeJSON('events.json', events);
  
  res.json({ ...newBand, members: [adminMember] });
});

app.put('/api/bands/:id', (req, res) => {
  const bands = readJSON('bands.json');
  const index = bands.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Band not found' });
  
  bands[index] = { ...bands[index], ...req.body };
  writeJSON('bands.json', bands);
  res.json(bands[index]);
});

app.delete('/api/bands/:id', (req, res) => {
  const bands = readJSON('bands.json').filter(b => b.id !== req.params.id);
  const members = readJSON('members.json').filter(m => m.bandId !== req.params.id);
  const events = readJSON('events.json').filter(e => e.bandId !== req.params.id);
  const sheets = readJSON('sheets.json').filter(s => {
    const event = events.find(e => e.id === s.eventId);
    return event && event.bandId === req.params.id;
  });
  
  writeJSON('bands.json', bands);
  writeJSON('members.json', members);
  writeJSON('events.json', events);
  writeJSON('sheets.json', sheets);
  
  res.json({ success: true });
});

app.get('/api/bands/:bandId/members', (req, res) => {
  const members = readJSON('members.json').filter(m => m.bandId === req.params.bandId);
  res.json(members);
});

app.post('/api/bands/:bandId/members', (req, res) => {
  const members = readJSON('members.json');
  const { email, name } = req.body;
  const newMember = {
    id: uuidv4(),
    bandId: req.params.bandId,
    email,
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    role: 'member',
    joinedAt: new Date().toISOString()
  };
  members.push(newMember);
  writeJSON('members.json', members);
  res.json(newMember);
});

app.get('/api/bands/:bandId/events', (req, res) => {
  const { month } = req.query;
  let events = readJSON('events.json').filter(e => e.bandId === req.params.bandId);
  
  if (month) {
    events = events.filter(e => e.date.startsWith(month));
  }
  
  const sheets = readJSON('sheets.json');
  const members = readJSON('members.json').filter(m => m.bandId === req.params.bandId);
  
  const eventsWithDetails = events.map(event => ({
    ...event,
    sheets: sheets.filter(s => s.eventId === event.id),
    confirmedMemberDetails: members.filter(m => event.confirmedMembers.includes(m.id))
  }));
  
  eventsWithDetails.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(eventsWithDetails);
});

app.put('/api/events/:id/confirm', (req, res) => {
  const events = readJSON('events.json');
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Event not found' });
  
  const { memberId, confirmed } = req.body;
  const event = events[index];
  
  if (confirmed) {
    if (!event.confirmedMembers.includes(memberId)) {
      event.confirmedMembers.push(memberId);
    }
  } else {
    event.confirmedMembers = event.confirmedMembers.filter(id => id !== memberId);
  }
  
  writeJSON('events.json', events);
  res.json(event);
});

app.put('/api/events/:id', (req, res) => {
  const events = readJSON('events.json');
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Event not found' });
  
  events[index] = { ...events[index], ...req.body };
  writeJSON('events.json', events);
  res.json(events[index]);
});

app.post('/api/events/:eventId/sheets', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const sheets = readJSON('sheets.json');
  const { annotation } = req.body;
  const eventId = req.params.eventId;
  
  const existingSheets = sheets.filter(s => s.eventId === eventId);
  const version = existingSheets.length + 1;
  
  const newSheet = {
    id: uuidv4(),
    eventId,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    uploadedAt: new Date().toISOString(),
    annotation: annotation || '',
    url: `/uploads/${req.file.filename}`,
    version
  };
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const remainingSheets = sheets.filter(s => {
    if (s.eventId !== eventId) return true;
    const uploadDate = new Date(s.uploadedAt);
    return uploadDate >= oneMonthAgo;
  });
  
  remainingSheets.push(newSheet);
  writeJSON('sheets.json', remainingSheets);
  
  res.json(newSheet);
});

app.get('/api/sheets/:id', (req, res) => {
  const sheets = readJSON('sheets.json');
  const sheet = sheets.find(s => s.id === req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.json(sheet);
});

app.get('/api/bands/:bandId/stats', (req, res) => {
  const { month } = req.query;
  let events = readJSON('events.json').filter(e => e.bandId === req.params.bandId);
  const members = readJSON('members.json').filter(m => m.bandId === req.params.bandId);
  
  if (month) {
    events = events.filter(e => e.date.startsWith(month));
  }
  
  const totalRehearsals = events.length;
  const memberStats = members.map(member => {
    const attended = events.filter(e => e.confirmedMembers.includes(member.id)).length;
    const attendanceRate = totalRehearsals > 0 ? (attended / totalRehearsals) * 100 : 0;
    
    let totalHours = 0;
    events.forEach(event => {
      if (event.confirmedMembers.includes(member.id)) {
        const [startH, startM] = event.startTime.split(':').map(Number);
        const [endH, endM] = event.endTime.split(':').map(Number);
        totalHours += (endH - startH) + (endM - startM) / 60;
      }
    });
    
    return {
      memberId: member.id,
      memberName: member.name,
      totalHours: Math.round(totalHours * 10) / 10,
      attendanceCount: attended,
      attendanceRate: Math.round(attendanceRate)
    };
  });
  
  const averageAttendanceRate = memberStats.length > 0
    ? Math.round(memberStats.reduce((sum, s) => sum + s.attendanceRate, 0) / memberStats.length)
    : 0;
  
  res.json({
    totalRehearsals,
    averageAttendanceRate,
    memberStats
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
