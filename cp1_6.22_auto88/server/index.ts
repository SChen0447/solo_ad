import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

export interface Operation {
  id: string;
  type: 'draw';
  color: string;
  gridX: number;
  gridY: number;
  brushSize: 1 | 4;
  userId: string;
  timestamp: number;
}

let operations: Operation[] = [];

app.get('/api/history', (_req, res) => {
  res.json({ operations });
});

app.post('/api/history', (req, res) => {
  const op: Omit<Operation, 'id' | 'timestamp'> = req.body;
  const newOp: Operation = {
    ...op,
    id: uuidv4(),
    timestamp: Date.now()
  };
  operations.push(newOp);
  res.json({ success: true, id: newOp.id });
});

app.delete('/api/history', (_req, res) => {
  operations = [];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Pixel Whiteboard server running on http://localhost:${PORT}`);
});
