import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  status: 'pending' | 'resolved';
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

interface DocumentVersion {
  id: string;
  content: string;
  comments: Comment[];
  timestamp: number;
}

interface DocumentState {
  content: string;
  comments: Comment[];
  versions: DocumentVersion[];
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

const documents: Record<string, DocumentState> = {
  default: {
    content: `<h1>项目需求建议书 (RFP)</h1>
<h2>1. 项目概述</h2>
<p>本项目旨在开发一套企业级协作平台，支持多团队成员实时协同编辑文档。</p>
<h2>2. 功能需求</h2>
<h3>2.1 文档编辑</h3>
<p>系统应支持富文本编辑，包括粗体、斜体、列表等基础格式化功能。</p>
<ul>
<li>支持多人同时编辑</li>
<li>支持实时同步</li>
<li>支持版本历史</li>
</ul>
<h3>2.2 评论系统</h3>
<p>用户可以对文档中的任意文本片段添加评论，并标记评论状态。</p>
<h2>3. 技术要求</h2>
<p>前端使用 React + TypeScript，后端使用 Node.js + Express。</p>`,
    comments: [],
    versions: [],
  },
};

const connectedUsers: Record<string, { documentId: string; username: string }> = {};

function compressData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(compressData).filter((item) => item !== null && item !== undefined);
  }
  if (data && typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const value = compressData(data[key]);
      if (value !== null && value !== undefined && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }
  return data;
}

function saveVersion(documentId: string) {
  const doc = documents[documentId];
  if (!doc) return;

  const version: DocumentVersion = {
    id: uuidv4(),
    content: doc.content,
    comments: JSON.parse(JSON.stringify(doc.comments)),
    timestamp: Date.now(),
  };

  doc.versions.unshift(version);
  if (doc.versions.length > 5) {
    doc.versions = doc.versions.slice(0, 5);
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-document', ({ documentId, username }: { documentId: string; username: string }) => {
    socket.join(documentId);
    connectedUsers[socket.id] = { documentId, username };

    const doc = documents[documentId] || documents['default'];
    const compressedDoc = compressData({
      content: doc.content,
      comments: doc.comments,
      versions: doc.versions,
    });

    socket.emit('document-state', compressedDoc);

    const usersInDoc = Object.entries(connectedUsers)
      .filter(([, info]) => info.documentId === documentId)
      .map(([id, info]) => ({ id, username: info.username }));
    io.to(documentId).emit('users-update', usersInDoc);
  });

  socket.on('document-update', ({ documentId, content }: { documentId: string; content: string }) => {
    const doc = documents[documentId] || documents['default'];
    if (doc) {
      doc.content = content;
      socket.to(documentId).emit('document-sync', { content });
    }
  });

  socket.on('comment-add', ({ documentId, comment }: { documentId: string; comment: Comment }) => {
    const doc = documents[documentId] || documents['default'];
    if (doc) {
      const newComment = { ...comment, id: uuidv4(), timestamp: Date.now() };
      doc.comments.push(newComment);
      io.to(documentId).emit('comment-added', compressData(newComment));
    }
  });

  socket.on('comment-update', ({ documentId, commentId, status }: { documentId: string; commentId: string; status: 'pending' | 'resolved' }) => {
    const doc = documents[documentId] || documents['default'];
    if (doc) {
      const comment = doc.comments.find((c) => c.id === commentId);
      if (comment) {
        comment.status = status;
        io.to(documentId).emit('comment-updated', { commentId, status });
      }
    }
  });

  socket.on('version-restore', ({ documentId, versionId }: { documentId: string; versionId: string }) => {
    const doc = documents[documentId] || documents['default'];
    if (doc) {
      const version = doc.versions.find((v) => v.id === versionId);
      if (version) {
        doc.content = version.content;
        doc.comments = JSON.parse(JSON.stringify(version.comments));
        io.to(documentId).emit('document-restored', {
          content: version.content,
          comments: version.comments,
        });
      }
    }
  });

  socket.on('autosave', ({ documentId, content, comments }: { documentId: string; content: string; comments: Comment[] }) => {
    const doc = documents[documentId] || documents['default'];
    if (doc) {
      doc.content = content;
      doc.comments = comments;
      saveVersion(documentId);
      socket.emit('versions-updated', doc.versions.map((v) => ({ id: v.id, timestamp: v.timestamp })));
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const userInfo = connectedUsers[socket.id];
    if (userInfo) {
      delete connectedUsers[socket.id];
      const usersInDoc = Object.entries(connectedUsers)
        .filter(([, info]) => info.documentId === userInfo.documentId)
        .map(([id, info]) => ({ id, username: info.username }));
      io.to(userInfo.documentId).emit('users-update', usersInDoc);
    }
  });
});

app.get('/api/documents/:id', (req, res) => {
  const docId = req.params.id;
  const doc = documents[docId] || documents['default'];
  if (doc) {
    res.json(compressData({ content: doc.content, comments: doc.comments }));
  } else {
    res.status(404).json({ error: 'Document not found' });
  }
});

app.get('/api/documents/:id/versions', (req, res) => {
  const docId = req.params.id;
  const doc = documents[docId] || documents['default'];
  if (doc) {
    res.json(doc.versions.map((v) => ({ id: v.id, timestamp: v.timestamp })));
  } else {
    res.status(404).json({ error: 'Document not found' });
  }
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
