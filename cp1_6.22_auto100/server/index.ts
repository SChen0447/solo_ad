import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { MoleculeData } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'data', 'molecules.json');

app.get('/api/molecules', (req: Request, res: Response) => {
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const molecules: MoleculeData[] = JSON.parse(rawData);
    res.json(molecules);
  } catch (error) {
    console.error('Error reading molecules data:', error);
    res.status(500).json({ error: 'Failed to load molecules data' });
  }
});

app.get('/api/molecules/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const molecules: MoleculeData[] = JSON.parse(rawData);
    const molecule = molecules.find(m => m.id === id);
    
    if (molecule) {
      res.json(molecule);
    } else {
      res.status(404).json({ error: 'Molecule not found' });
    }
  } catch (error) {
    console.error('Error reading molecule data:', error);
    res.status(500).json({ error: 'Failed to load molecule data' });
  }
});

app.listen(PORT, () => {
  console.log(`Molecule API server running on port ${PORT}`);
  console.log(`GET /api/molecules - List all molecules`);
  console.log(`GET /api/molecules/:id - Get specific molecule`);
});
