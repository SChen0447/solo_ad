import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Trip, DiaryEntry, Photo, StoredImage } from '../src/types.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const trips = new Map<string, Trip>();
const diaries = new Map<string, DiaryEntry>();
const images = new Map<string, StoredImage>();

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.get('/api/trips', (_req, res) => {
  const allTrips = Array.from(trips.values());
  res.json(allTrips);
});

app.post('/api/trips', (req, res) => {
  const { name } = req.body;
  const trip: Trip = {
    id: uuidv4(),
    name: name || '未命名旅行',
    days: [],
    createdAt: new Date().toISOString(),
  };
  trips.set(trip.id, trip);
  res.json(trip);
});

app.get('/api/trips/:id', (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json(trip);
});

app.put('/api/trips/:id', (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const updated = { ...trip, ...req.body, id: trip.id };
  trips.set(trip.id, updated);
  res.json(updated);
});

app.delete('/api/trips/:id', (req, res) => {
  const success = trips.delete(req.params.id);
  res.json({ success });
});

app.post('/api/trips/:tripId/days', (req, res) => {
  const trip = trips.get(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const dayNumber = trip.days.length + 1;
  const day = {
    id: uuidv4(),
    dayNumber,
    date: req.body.date || new Date().toISOString().split('T')[0],
    spots: [],
  };
  trip.days.push(day);
  trips.set(trip.id, trip);
  res.json(day);
});

app.post('/api/trips/:tripId/days/:dayId/spots', (req, res) => {
  const trip = trips.get(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const day = trip.days.find((d) => d.id === req.params.dayId);
  if (!day) {
    res.status(404).json({ error: 'Day not found' });
    return;
  }
  const spot = {
    id: uuidv4(),
    name: req.body.name || '新景点',
    duration: req.body.duration || 60,
    lat: req.body.lat || 0,
    lng: req.body.lng || 0,
    order: day.spots.length,
  };
  day.spots.push(spot);
  trips.set(trip.id, trip);
  res.json(spot);
});

app.put('/api/trips/:tripId/days/:dayId/spots/reorder', (req, res) => {
  const trip = trips.get(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const day = trip.days.find((d) => d.id === req.params.dayId);
  if (!day) {
    res.status(404).json({ error: 'Day not found' });
    return;
  }
  const { spotIds } = req.body as { spotIds: string[] };
  day.spots = spotIds
    .map((id: string, index: number) => {
      const spot = day.spots.find((s) => s.id === id);
      if (spot) {
        return { ...spot, order: index };
      }
      return null;
    })
    .filter(Boolean) as typeof day.spots;
  trips.set(trip.id, trip);
  res.json(day.spots);
});

app.put('/api/spots/:spotId', (req, res) => {
  for (const trip of trips.values()) {
    for (const day of trip.days) {
      const spot = day.spots.find((s) => s.id === req.params.spotId);
      if (spot) {
        Object.assign(spot, req.body, { id: spot.id });
        trips.set(trip.id, trip);
        res.json(spot);
        return;
      }
    }
  }
  res.status(404).json({ error: 'Spot not found' });
});

app.delete('/api/spots/:spotId', (req, res) => {
  for (const trip of trips.values()) {
    for (const day of trip.days) {
      const idx = day.spots.findIndex((s) => s.id === req.params.spotId);
      if (idx !== -1) {
        day.spots.splice(idx, 1);
        day.spots.forEach((s, i) => (s.order = i));
        trips.set(trip.id, trip);
        res.json({ success: true });
        return;
      }
    }
  }
  res.status(404).json({ error: 'Spot not found' });
});

app.get('/api/trips/:tripId/diaries', (req, res) => {
  const tripDiaries = Array.from(diaries.values())
    .filter((d) => d.tripId === req.params.tripId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(tripDiaries);
});

app.post('/api/trips/:tripId/diaries', (req, res) => {
  const entry: DiaryEntry = {
    id: uuidv4(),
    tripId: req.params.tripId,
    spotId: req.body.spotId || '',
    spotName: req.body.spotName || '',
    content: req.body.content || '',
    lat: req.body.lat || 0,
    lng: req.body.lng || 0,
    createdAt: new Date().toISOString(),
  };
  diaries.set(entry.id, entry);
  res.json(entry);
});

app.put('/api/diaries/:id', (req, res) => {
  const entry = diaries.get(req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Diary not found' });
    return;
  }
  const updated = { ...entry, ...req.body, id: entry.id, tripId: entry.tripId };
  diaries.set(entry.id, updated);
  res.json(updated);
});

app.delete('/api/diaries/:id', (req, res) => {
  const success = diaries.delete(req.params.id);
  res.json({ success });
});

app.get('/api/trips/:tripId/album', (req, res) => {
  const tripDiaries = Array.from(diaries.values()).filter(
    (d) => d.tripId === req.params.tripId
  );
  const photos: Photo[] = [];
  for (const diary of tripDiaries) {
    const imgRegex = /src="([^"]*)"/g;
    let match;
    while ((match = imgRegex.exec(diary.content)) !== null) {
      photos.push({
        id: uuidv4(),
        url: match[1],
        date: diary.createdAt.split('T')[0],
        diaryId: diary.id,
      });
    }
  }
  res.json(photos);
});

app.post('/api/upload', (req, res) => {
  const { data, mimeType } = req.body;
  if (!data) {
    res.status(400).json({ error: 'No image data provided' });
    return;
  }
  const id = uuidv4();
  images.set(id, { id, data, mimeType: mimeType || 'image/png' });
  res.json({ url: `/api/images/${id}` });
});

app.get('/api/images/:id', (req, res) => {
  const img = images.get(req.params.id);
  if (!img) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }
  const buffer = Buffer.from(img.data, 'base64');
  res.setHeader('Content-Type', img.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(buffer);
});

app.post('/api/trips/:tripId/calculate-distance', (req, res) => {
  const trip = trips.get(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const results = trip.days.map((day) => {
    let totalDistance = 0;
    const moveTimes: number[] = [];
    for (let i = 1; i < day.spots.length; i++) {
      const prev = day.spots[i - 1];
      const curr = day.spots[i];
      const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      totalDistance += dist;
      moveTimes.push(Math.round((dist / 40) * 60));
    }
    return {
      dayId: day.id,
      totalDistance: Math.round(totalDistance * 10) / 10,
      moveTimes,
    };
  });
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

export default app;
