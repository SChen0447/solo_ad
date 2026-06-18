import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface HistoryEntry {
  content: string;
  timestamp: number;
  authorName: string;
}

interface Paragraph {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  history: HistoryEntry[];
}

interface Story {
  id: string;
  title: string;
  paragraphs: Paragraph[];
  createdAt: number;
}

interface ConnectedUser {
  id: string;
  name: string;
  storyId: string;
}

const stories = new Map<string, Story>();
const connectedUsers = new Map<string, ConnectedUser>();

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.post('/api/stories', (_req, res) => {
  const id = uuidv4();
  const story: Story = {
    id,
    title: '未命名故事',
    paragraphs: [],
    createdAt: Date.now(),
  };
  stories.set(id, story);
  res.json({ id, title: story.title });
});

app.get('/api/stories/:id', (req, res) => {
  const story = stories.get(req.params.id);
  if (!story) {
    res.status(404).json({ error: '故事不存在' });
    return;
  }
  res.json(story);
});

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('join-story', (data: { storyId: string; userName: string }) => {
    const { storyId, userName } = data;
    let story = stories.get(storyId);
    if (!story) {
      story = {
        id: storyId,
        title: '未命名故事',
        paragraphs: [],
        createdAt: Date.now(),
      };
      stories.set(storyId, story);
    }

    socket.join(storyId);

    connectedUsers.set(socket.id, {
      id: socket.id,
      name: userName,
      storyId,
    });

    socket.emit('story-state', story);

    const usersInStory = Array.from(connectedUsers.values()).filter(
      (u) => u.storyId === storyId
    );
    io.to(storyId).emit('online-users', usersInStory);
  });

  socket.on('add-paragraph', (data: { storyId: string; paragraph: Omit<Paragraph, 'history'> }) => {
    const story = stories.get(data.storyId);
    if (!story) return;

    const paragraph: Paragraph = {
      ...data.paragraph,
      history: [],
    };
    story.paragraphs.push(paragraph);
    io.to(data.storyId).emit('paragraph-added', paragraph);
  });

  socket.on('update-paragraph', (data: { storyId: string; paragraphId: string; content: string; authorName: string }) => {
    const story = stories.get(data.storyId);
    if (!story) return;

    const paragraph = story.paragraphs.find((p) => p.id === data.paragraphId);
    if (!paragraph) return;

    if (paragraph.history.length >= 20) {
      paragraph.history.shift();
    }
    paragraph.history.push({
      content: paragraph.content,
      timestamp: Date.now(),
      authorName: data.authorName,
    });

    paragraph.content = data.content;
    paragraph.updatedAt = Date.now();

    io.to(data.storyId).emit('paragraph-updated', {
      id: paragraph.id,
      content: paragraph.content,
      updatedAt: paragraph.updatedAt,
      history: paragraph.history,
      updatedBy: data.authorName,
    });
  });

  socket.on('fork-paragraph', (data: { storyId: string; parentId: string; newParagraph: Omit<Paragraph, 'history'> }) => {
    const story = stories.get(data.storyId);
    if (!story) return;

    const paragraph: Paragraph = {
      ...data.newParagraph,
      history: [],
    };
    story.paragraphs.push(paragraph);
    io.to(data.storyId).emit('paragraph-forked', paragraph);
  });

  socket.on('update-title', (data: { storyId: string; title: string }) => {
    const story = stories.get(data.storyId);
    if (!story) return;
    story.title = data.title;
    io.to(data.storyId).emit('title-updated', data.title);
  });

  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);
      const usersInStory = Array.from(connectedUsers.values()).filter(
        (u) => u.storyId === user.storyId
      );
      io.to(user.storyId).emit('online-users', usersInStory);
    }
  });
});

const PORT = 4001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
