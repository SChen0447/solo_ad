import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_PATH = path.join(__dirname, '..', 'data', 'tours.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

interface Merchandise {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold: number;
  imageUrl: string;
}

interface Stop {
  id: string;
  city: string;
  venue: string;
  date: string;
  expectedAudience: number;
  actualAudience: number;
  ticketPrice: number;
  merchandise: Merchandise[];
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface Tour {
  id: string;
  name: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  description: string;
  stops: Stop[];
  createdAt: string;
}

interface RevenueData {
  stopId: string;
  city: string;
  venue: string;
  date: string;
  ticketRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
}

const readData = (): Tour[] => {
  if (!fs.existsSync(DATA_PATH)) {
    return [];
  }
  const data = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(data || '[]');
};

const writeData = (data: Tour[]): void => {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

app.get('/api/tours', (_req: Request, res: Response<Tour[]>) => {
  try {
    const tours = readData();
    res.json(tours);
  } catch (error) {
    res.status(500).json([] as Tour[]);
  }
});

app.get('/api/tours/:id', (req: Request, res: Response<Tour | { error: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }
    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tour' });
  }
});

app.post('/api/tours', (req: Request, res: Response<Tour | { error: string }>) => {
  try {
    const { name, coverImage, startDate, endDate, description } = req.body;
    if (!name || !startDate || !endDate) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const tours = readData();
    const newTour: Tour = {
      id: uuidv4(),
      name,
      coverImage: coverImage || '',
      startDate,
      endDate,
      description: description || '',
      stops: [],
      createdAt: new Date().toISOString(),
    };
    tours.push(newTour);
    writeData(tours);
    res.json(newTour);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tour' });
  }
});

app.put('/api/tours/:id', (req: Request, res: Response<Tour | { error: string }>) => {
  try {
    const tours = readData();
    const index = tours.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }
    tours[index] = { ...tours[index], ...req.body, id: tours[index].id };
    writeData(tours);
    res.json(tours[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tour' });
  }
});

app.delete('/api/tours/:id', (req: Request, res: Response<{ success: boolean; error?: string }>) => {
  try {
    const tours = readData();
    const filtered = tours.filter(t => t.id !== req.params.id);
    if (filtered.length === tours.length) {
      res.status(404).json({ success: false, error: 'Tour not found' });
      return;
    }
    writeData(filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete tour' });
  }
});

app.post('/api/tours/:id/stops', (req: Request, res: Response<Stop | { error: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }
    const { city, venue, date, expectedAudience, actualAudience, ticketPrice, status } = req.body;
    if (!city || !venue || !date) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const newStop: Stop = {
      id: uuidv4(),
      city,
      venue,
      date,
      expectedAudience: expectedAudience || 0,
      actualAudience: actualAudience || 0,
      ticketPrice: ticketPrice || 0,
      merchandise: [],
      status: status || 'upcoming',
    };
    tour.stops.push(newStop);
    writeData(tours);
    res.json(newStop);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add stop' });
  }
});

app.put('/api/tours/:id/stops/:stopId', (req: Request, res: Response<Stop | { error: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }
    const stopIndex = tour.stops.findIndex(s => s.id === req.params.stopId);
    if (stopIndex === -1) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }
    tour.stops[stopIndex] = { ...tour.stops[stopIndex], ...req.body, id: tour.stops[stopIndex].id };
    writeData(tours);
    res.json(tour.stops[stopIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stop' });
  }
});

app.delete('/api/tours/:id/stops/:stopId', (req: Request, res: Response<{ success: boolean; error?: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ success: false, error: 'Tour not found' });
      return;
    }
    const initialLength = tour.stops.length;
    tour.stops = tour.stops.filter(s => s.id !== req.params.stopId);
    if (tour.stops.length === initialLength) {
      res.status(404).json({ success: false, error: 'Stop not found' });
      return;
    }
    writeData(tours);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete stop' });
  }
});

app.post('/api/tours/:id/stops/:stopId/merch', (req: Request, res: Response<Merchandise | { error: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }
    const stop = tour.stops.find(s => s.id === req.params.stopId);
    if (!stop) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }
    const { name, price, stock, imageUrl } = req.body;
    if (!name || price === undefined || stock === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const newMerch: Merchandise = {
      id: uuidv4(),
      name,
      price,
      stock,
      sold: 0,
      imageUrl: imageUrl || '',
    };
    stop.merchandise.push(newMerch);
    writeData(tours);
    res.json(newMerch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add merchandise' });
  }
});

app.put('/api/tours/:id/stops/:stopId/merch/:merchId', (req: Request, res: Response<Merchandise | { error: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }
    const stop = tour.stops.find(s => s.id === req.params.stopId);
    if (!stop) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }
    const merchIndex = stop.merchandise.findIndex(m => m.id === req.params.merchId);
    if (merchIndex === -1) {
      res.status(404).json({ error: 'Merchandise not found' });
      return;
    }
    stop.merchandise[merchIndex] = { ...stop.merchandise[merchIndex], ...req.body, id: stop.merchandise[merchIndex].id };
    writeData(tours);
    res.json(stop.merchandise[merchIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update merchandise' });
  }
});

app.delete('/api/tours/:id/stops/:stopId/merch/:merchId', (req: Request, res: Response<{ success: boolean; error?: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ success: false, error: 'Tour not found' });
      return;
    }
    const stop = tour.stops.find(s => s.id === req.params.stopId);
    if (!stop) {
      res.status(404).json({ success: false, error: 'Stop not found' });
      return;
    }
    const initialLength = stop.merchandise.length;
    stop.merchandise = stop.merchandise.filter(m => m.id !== req.params.merchId);
    if (stop.merchandise.length === initialLength) {
      res.status(404).json({ success: false, error: 'Merchandise not found' });
      return;
    }
    writeData(tours);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete merchandise' });
  }
});

app.get('/api/tours/:id/revenue', (req: Request, res: Response<{ average: number; data: RevenueData[] } | { error: string }>) => {
  try {
    const tours = readData();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }
    const data: RevenueData[] = tour.stops.map(stop => {
      const ticketRevenue = stop.actualAudience * stop.ticketPrice;
      const merchRevenue = stop.merchandise.reduce((sum, m) => sum + m.sold * m.price, 0);
      return {
        stopId: stop.id,
        city: stop.city,
        venue: stop.venue,
        date: stop.date,
        ticketRevenue,
        merchRevenue,
        totalRevenue: ticketRevenue + merchRevenue,
      };
    });
    const total = data.reduce((sum, d) => sum + d.totalRevenue, 0);
    const average = data.length > 0 ? total / data.length : 0;
    res.json({ average, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate revenue' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
