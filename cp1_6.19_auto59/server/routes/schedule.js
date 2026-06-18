import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

let dataStore = {
  members: [],
  meetings: []
};

router.get('/', (req, res) => {
  res.json(dataStore);
});

router.post('/members', (req, res) => {
  const { name, timezone, availability } = req.body;
  if (!name || !timezone || !availability) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const newMember = {
    id: uuidv4(),
    name,
    timezone,
    availability,
    order: dataStore.members.length
  };
  dataStore.members.push(newMember);
  res.status(201).json(newMember);
});

router.delete('/members/:id', (req, res) => {
  const { id } = req.params;
  const index = dataStore.members.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '成员不存在' });
  }
  dataStore.members.splice(index, 1);
  res.json({ success: true });
});

router.put('/members/order', (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order 必须是数组' });
  }
  order.forEach((memberId, idx) => {
    const member = dataStore.members.find(m => m.id === memberId);
    if (member) {
      member.order = idx;
    }
  });
  dataStore.members.sort((a, b) => a.order - b.order);
  res.json({ success: true, members: dataStore.members });
});

router.post('/meetings', (req, res) => {
  const { title, description, startTime, endTime, duration, attendees } = req.body;
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const newMeeting = {
    id: uuidv4(),
    title,
    description: description || '',
    startTime,
    endTime,
    duration: duration || 30,
    attendees: attendees || []
  };
  dataStore.meetings.push(newMeeting);
  res.status(201).json(newMeeting);
});

router.delete('/meetings/:id', (req, res) => {
  const { id } = req.params;
  const index = dataStore.meetings.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  dataStore.meetings.splice(index, 1);
  res.json({ success: true });
});

router.get('/suggestions', (req, res) => {
  const { days = 7 } = req.query;
  const suggestions = calculateSuggestions(dataStore.members, parseInt(days));
  res.json(suggestions);
});

function calculateSuggestions(members, days) {
  if (members.length === 0) return [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const suggestions = [];

  for (let day = 0; day < days; day++) {
    const currentDate = new Date(startOfDay);
    currentDate.setDate(currentDate.getDate() + day);
    const dayOfWeek = currentDate.getDay();

    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        const availableMembers = members.filter(member =>
          isMemberAvailable(member, dayOfWeek, hour, minute)
        );

        if (availableMembers.length >= Math.ceil(members.length * 0.5)) {
          suggestions.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            attendeeCount: availableMembers.length,
            attendees: availableMembers.map(m => m.name)
          });
        }
      }
    }
  }

  return suggestions
    .sort((a, b) => b.attendeeCount - a.attendeeCount)
    .slice(0, 20);
}

function isMemberAvailable(member, dayOfWeek, hour, minute) {
  const currentMinutes = hour * 60 + minute;
  return member.availability.some(slot => {
    if (slot.dayOfWeek !== dayOfWeek) return false;
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes - 29;
  });
}

export default router;
