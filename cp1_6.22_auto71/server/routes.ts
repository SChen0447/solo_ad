import { Router, Request, Response } from 'express';
import {
  getAllTravels,
  getTravelById,
  createTravel,
  getPOIsByTravelId,
  createPOI,
  getRouteByTravelId,
  deleteTravel,
  deletePOI,
  POIWithParsedImages,
} from './database.js';

const router = Router();

router.get('/travels', (_req: Request, res: Response) => {
  try {
    const travels = getAllTravels();
    res.json(travels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch travels' });
  }
});

router.get('/travels/:id', (req: Request, res: Response) => {
  try {
    const travel = getTravelById(req.params.id);
    if (!travel) {
      res.status(404).json({ error: 'Travel not found' });
      return;
    }
    const pois = getPOIsByTravelId(req.params.id);
    res.json({ ...travel, pois });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch travel' });
  }
});

router.post('/travels', (req: Request, res: Response) => {
  try {
    const { name, city, start_date, end_date, summary } = req.body;
    if (!name || !city || !start_date || !end_date) {
      res.status(400).json({ error: 'Missing required fields: name, city, start_date, end_date' });
      return;
    }
    const travel = createTravel({ name, city, start_date, end_date, summary: summary || '' });
    res.status(201).json(travel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create travel' });
  }
});

router.delete('/travels/:id', (req: Request, res: Response) => {
  try {
    const success = deleteTravel(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Travel not found' });
      return;
    }
    res.json({ message: 'Travel deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete travel' });
  }
});

router.post('/travels/:id/pois', (req: Request, res: Response) => {
  try {
    const travelId = req.params.id;
    const travel = getTravelById(travelId);
    if (!travel) {
      res.status(404).json({ error: 'Travel not found' });
      return;
    }
    const { name, latitude, longitude, arrived_at, description, image_urls } = req.body;
    if (!name || latitude === undefined || longitude === undefined || !arrived_at) {
      res.status(400).json({ error: 'Missing required fields: name, latitude, longitude, arrived_at' });
      return;
    }
    const existingPois = getPOIsByTravelId(travelId);
    if (existingPois.length >= 50) {
      res.status(400).json({ error: 'Maximum 50 POIs per travel' });
      return;
    }
    const poi = createPOI({
      travel_id: travelId,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      arrived_at,
      description: description || '',
      image_urls: image_urls || [],
    });
    res.status(201).json(poi);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create POI' });
  }
});

router.delete('/pois/:id', (req: Request, res: Response) => {
  try {
    const success = deletePOI(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'POI not found' });
      return;
    }
    res.json({ message: 'POI deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete POI' });
  }
});

router.get('/travels/:id/route', (req: Request, res: Response) => {
  try {
    const travel = getTravelById(req.params.id);
    if (!travel) {
      res.status(404).json({ error: 'Travel not found' });
      return;
    }
    const pois = getRouteByTravelId(req.params.id);
    const segments: Array<{
      from: POIWithParsedImages;
      to: POIWithParsedImages;
      duration: string;
      distance: number;
    }> = [];
    for (let i = 0; i < pois.length - 1; i++) {
      const from = pois[i];
      const to = pois[i + 1];
      const fromTime = new Date(from.arrived_at).getTime();
      const toTime = new Date(to.arrived_at).getTime();
      const durationMs = toTime - fromTime;
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const duration = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
      const distance = haversineDistance(from.latitude, from.longitude, to.latitude, to.longitude);
      segments.push({ from, to, duration, distance });
    }
    res.json({ pois, segments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default router;
