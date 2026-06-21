import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import Datastore from 'nedb';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation, Session, User, ClientEvent, ServerEvent } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/ws',
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const annotationsDB = new Datastore({ filename: path.join(__dirname, '../data/annotations.db'), autoload: true });
const sessionsDB = new Datastore({ filename: path.join(__dirname, '../data/sessions.db'), autoload: true });

const connectedUsers = new Map<string, Set<string>>();

app.post('/api/sessions', async (req, res) => {
  try {
    const { name, imageData, createdBy } = req.body;
    
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const format = imageData.match(/^data:image\/(\w+);base64,/)?.[1] || 'png';
    const filename = `${uuidv4()}.${format}`;
    const uploadsDir = path.join(__dirname, '../uploads');
    
    await import('fs').then(fs => {
      if (!fs.default.existsSync(uploadsDir)) {
        fs.default.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.default.writeFileSync(path.join(uploadsDir, filename), base64Data, 'base64');
    });

    const session: Session = {
      id: uuidv4(),
      name,
      imageUrl: `/uploads/${filename}`,
      createdAt: Date.now(),
      createdBy,
    };

    sessionsDB.insert(session, (err, newSession) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(newSession);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.get('/api/sessions/:id', (req, res) => {
  sessionsDB.findOne({ id: req.params.id }, (err, session) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  });
});

app.get('/api/sessions/:id/annotations', (req, res) => {
  const { id } = req.params;
  const { user, type } = req.query;
  
  const query: Record<string, unknown> = { sessionId: id };
  if (user) query.userId = user as string;
  if (type) query.type = type as string;

  annotationsDB.find(query).sort({ timestamp: 1 }).exec((err, annotations) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(annotations);
  });
});

app.post('/api/annotations', (req, res) => {
  const annotation: Annotation = req.body;
  annotationsDB.insert(annotation, (err, newAnnotation) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const event: ServerEvent = { type: 'annotation:added', data: newAnnotation as Annotation };
    io.to(annotation.sessionId).emit('event', event);
    
    res.json(newAnnotation);
  });
});

app.put('/api/annotations/:id', (req, res) => {
  const { id } = req.params;
  const update = req.body;
  
  annotationsDB.update({ id }, { $set: update }, {}, (err, numReplaced) => {
    if (err) return res.status(500).json({ error: err.message });
    if (numReplaced === 0) return res.status(404).json({ error: 'Annotation not found' });
    
    annotationsDB.findOne({ id }, (err, updatedAnnotation) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const event: ServerEvent = { type: 'annotation:updated', data: updatedAnnotation as Annotation };
      io.to(update.sessionId).emit('event', event);
      
      res.json(updatedAnnotation);
    });
  });
});

app.delete('/api/annotations/:id', (req, res) => {
  const { id } = req.params;
  
  annotationsDB.findOne({ id }, (err, annotation) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!annotation) return res.status(404).json({ error: 'Annotation not found' });
    
    annotationsDB.remove({ id }, {}, (err, numRemoved) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const event: ServerEvent = { 
        type: 'annotation:deleted', 
        data: { id, sessionId: (annotation as Annotation).sessionId } 
      };
      io.to((annotation as Annotation).sessionId).emit('event', event);
      
      res.json({ success: true, removed: numRemoved });
    });
  });
});

app.delete('/api/sessions/:sessionId/annotations', (req, res) => {
  const { sessionId } = req.params;
  const { ids } = req.body;
  
  annotationsDB.remove({ id: { $in: ids }, sessionId }, { multi: true }, (err, numRemoved) => {
    if (err) return res.status(500).json({ error: err.message });
    
    ids.forEach((id: string) => {
      const event: ServerEvent = { 
        type: 'annotation:deleted', 
        data: { id, sessionId } 
      };
      io.to(sessionId).emit('event', event);
    });
    
    res.json({ success: true, removed: numRemoved });
  });
});

app.get('/api/sessions/:id/replay', (req, res) => {
  const { id } = req.params;
  
  annotationsDB.find({ sessionId: id }).sort({ timestamp: 1 }).exec((err, annotations) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const typedAnnotations = annotations as Annotation[];
    const startTime = typedAnnotations.length > 0 ? typedAnnotations[0].timestamp : Date.now();
    const endTime = typedAnnotations.length > 0 ? typedAnnotations[typedAnnotations.length - 1].timestamp : startTime;
    
    const normalizedAnnotations = typedAnnotations.map(a => ({
      ...a,
      relativeTime: a.timestamp - startTime,
    }));
    
    res.json({
      sessionId: id,
      totalDuration: endTime - startTime,
      annotations: normalizedAnnotations,
      shareLink: `/replay/${id}`,
    });
  });
});

io.on('connection', (socket) => {
  socket.on('event', (event: ClientEvent) => {
    switch (event.type) {
      case 'session:join': {
        const { sessionId, user } = event.data;
        socket.join(sessionId);
        
        if (!connectedUsers.has(sessionId)) {
          connectedUsers.set(sessionId, new Set());
        }
        connectedUsers.get(sessionId)!.add(user.id);
        
        const serverEvent: ServerEvent = { type: 'user:joined', data: user };
        socket.to(sessionId).emit('event', serverEvent);
        break;
      }
      
      case 'session:leave': {
        const { sessionId, userId } = event.data;
        socket.leave(sessionId);
        
        const users = connectedUsers.get(sessionId);
        if (users) {
          users.delete(userId);
          if (users.size === 0) {
            connectedUsers.delete(sessionId);
          }
        }
        
        const serverEvent: ServerEvent = { type: 'user:left', data: { userId } };
        socket.to(sessionId).emit('event', serverEvent);
        break;
      }
      
      case 'annotation:add': {
        annotationsDB.insert(event.data, (err, newAnnotation) => {
          if (!err) {
            const serverEvent: ServerEvent = { type: 'annotation:added', data: newAnnotation as Annotation };
            io.to(event.data.sessionId).emit('event', serverEvent);
          }
        });
        break;
      }
      
      case 'annotation:update': {
        annotationsDB.update({ id: event.data.id }, { $set: event.data }, {}, (err) => {
          if (!err) {
            const serverEvent: ServerEvent = { type: 'annotation:updated', data: event.data };
            io.to(event.data.sessionId).emit('event', serverEvent);
          }
        });
        break;
      }
      
      case 'annotation:delete': {
        annotationsDB.remove({ id: event.data.id }, {}, (err) => {
          if (!err) {
            const serverEvent: ServerEvent = { type: 'annotation:deleted', data: event.data };
            io.to(event.data.sessionId).emit('event', serverEvent);
          }
        });
        break;
      }
    }
  });
  
  socket.on('disconnect', () => {
    connectedUsers.forEach((users, sessionId) => {
      users.forEach(userId => {
        const serverEvent: ServerEvent = { type: 'user:left', data: { userId } };
        socket.to(sessionId).emit('event', serverEvent);
      });
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket path: /ws`);
});
