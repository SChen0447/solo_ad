import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import {
  addDesign,
  getDesign,
  getAllDesigns,
  addAnnotation,
  updateAnnotation,
  deleteAnnotation,
  addComment,
  exportData,
  importData,
  Design,
  Annotation
} from './store';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/designs', (_req: Request, res: Response) => {
  const designs = getAllDesigns();
  res.json(designs);
});

app.get('/api/designs/:id', (req: Request, res: Response) => {
  const design = getDesign(req.params.id);
  if (!design) {
    res.status(404).json({ error: 'Design not found' });
    return;
  }
  const { imageData, ...designWithoutImage } = design;
  res.json({
    ...designWithoutImage,
    imageData
  });
});

app.post('/api/designs', (req: Request, res: Response) => {
  const { name, imageData } = req.body;
  if (!name || !imageData) {
    res.status(400).json({ error: 'Name and imageData are required' });
    return;
  }
  const design = addDesign(name, imageData);
  const { imageData: _img, ...designMeta } = design;
  io.emit('design:created', designMeta);
  res.status(201).json(design);
});

app.post('/api/designs/:id/annotations', (req: Request, res: Response) => {
  const designId = req.params.id;
  const annotation = addAnnotation(designId, req.body);
  if (!annotation) {
    res.status(404).json({ error: 'Design not found' });
    return;
  }
  io.to(designId).emit('annotation:created', designId, annotation);
  res.status(201).json(annotation);
});

app.put('/api/designs/:id/annotations/:annotationId', (req: Request, res: Response) => {
  const { id: designId, annotationId } = req.params;
  const annotation = updateAnnotation(designId, annotationId, req.body);
  if (!annotation) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }
  io.to(designId).emit('annotation:updated', designId, annotation);
  res.json(annotation);
});

app.delete('/api/designs/:id/annotations/:annotationId', (req: Request, res: Response) => {
  const { id: designId, annotationId } = req.params;
  const success = deleteAnnotation(designId, annotationId);
  if (!success) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }
  io.to(designId).emit('annotation:deleted', designId, annotationId);
  res.json({ success: true });
});

app.post('/api/designs/:id/annotations/:annotationId/comments', (req: Request, res: Response) => {
  const { id: designId, annotationId } = req.params;
  const { author, content } = req.body;
  const comment = addComment(designId, annotationId, author, content);
  if (!comment) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }
  io.to(designId).emit('comment:created', designId, annotationId, comment);
  res.status(201).json(comment);
});

app.get('/api/export', (_req: Request, res: Response) => {
  const data = exportData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=designs-export.json');
  res.json(data);
});

app.post('/api/import', (req: Request, res: Response) => {
  const count = importData(req.body);
  io.emit('data:imported');
  res.json({ imported: count });
});

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('design:join', (designId: string) => {
    socket.join(designId);
    console.log(`Socket ${socket.id} joined room ${designId}`);
  });

  socket.on('design:leave', (designId: string) => {
    socket.leave(designId);
    console.log(`Socket ${socket.id} left room ${designId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
