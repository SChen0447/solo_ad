import express from 'express';
import cors from 'cors';
import { dataStore, Waypoint } from './dataStore';
import { getPOIsNearRoute, getRouteStats, addPOIToRoute } from './routeService';
import { generateReport } from './reportService';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/routes', (_req, res) => {
  const routes = dataStore.getAllRoutes();
  res.json(routes);
});

app.get('/api/routes/:id', (req, res) => {
  const route = dataStore.getRoute(req.params.id);
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json(route);
});

app.post('/api/routes', (req, res) => {
  const route = dataStore.createRoute(req.body);
  res.status(201).json(route);
});

app.put('/api/routes/:id', (req, res) => {
  const route = dataStore.updateRoute(req.params.id, req.body);
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json(route);
});

app.delete('/api/routes/:id', (req, res) => {
  const success = dataStore.deleteRoute(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.status(204).send();
});

app.post('/api/routes/:id/waypoints', (req, res) => {
  const waypoint = req.body as Omit<Waypoint, 'id'>;
  const route = dataStore.addWaypoint(req.params.id, waypoint);
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json(route);
});

app.delete('/api/routes/:id/waypoints/:waypointId', (req, res) => {
  const route = dataStore.removeWaypoint(req.params.id, req.params.waypointId);
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json(route);
});

app.put('/api/routes/:id/reorder', (req, res) => {
  const { waypointIds } = req.body;
  const route = dataStore.reorderWaypoints(req.params.id, waypointIds);
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json(route);
});

app.get('/api/routes/:id/stats', (req, res) => {
  const stats = getRouteStats(req.params.id);
  if (!stats) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json(stats);
});

app.post('/api/routes/:id/point', (req, res) => {
  const { poiId } = req.body;
  const route = addPOIToRoute(req.params.id, poiId);
  if (!route) {
    res.status(404).json({ error: 'Route or POI not found' });
    return;
  }
  res.json(route);
});

app.get('/api/pois', (_req, res) => {
  const pois = dataStore.getAllPOIs();
  res.json(pois);
});

app.get('/api/pois/:id', (req, res) => {
  const poi = dataStore.getPOI(req.params.id);
  if (!poi) {
    res.status(404).json({ error: 'POI not found' });
    return;
  }
  res.json(poi);
});

app.get('/api/routes/:id/pois', (req, res) => {
  const pois = getPOIsNearRoute(req.params.id, 20);
  res.json(pois);
});

app.get('/api/checkins', (_req, res) => {
  res.json([]);
});

app.get('/api/checkins/:id', (req, res) => {
  const checkin = dataStore.getCheckin(req.params.id);
  if (!checkin) {
    res.status(404).json({ error: 'Checkin not found' });
    return;
  }
  res.json(checkin);
});

app.get('/api/routes/:id/checkins', (req, res) => {
  const checkins = dataStore.getCheckinsByRoute(req.params.id);
  res.json(checkins);
});

app.post('/api/checkins', (req, res) => {
  const { routeId, poiId, comment, timestamp, photoName, lat, lng } = req.body;
  if (!routeId || !poiId) {
    res.status(400).json({ error: 'routeId and poiId are required' });
    return;
  }
  const poi = dataStore.getPOI(poiId);
  const checkin = dataStore.createCheckin({
    routeId,
    poiId,
    comment: comment || '',
    photoName: photoName || null,
    timestamp: timestamp || new Date().toISOString(),
    lat: lat || poi?.lat || 0,
    lng: lng || poi?.lng || 0,
  });
  res.status(201).json(checkin);
});

app.get('/api/reports/:routeId', (req, res) => {
  const report = generateReport(req.params.routeId);
  if (!report) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json(report);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
