import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const state = {
  code: `// 欢迎使用实时代码协作编辑器
// 打开多个浏览器窗口即可体验多人协作
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}

hello('World');`,
  version: 0,
  users: new Map(),
  history: [],
  snapshots: [],
  userHistory: new Map(),
  userRedo: new Map(),
};

const MAX_HISTORY = 100;
const MAX_USER_HISTORY = 5;

function applyOps(code, ops) {
  let newCode = code;
  const sortedOps = [...ops].sort((a, b) => b.from - a.from);
  
  for (const op of sortedOps) {
    if (op.type === 'insert') {
      newCode = newCode.slice(0, op.from) + (op.text || '') + newCode.slice(op.from);
    } else if (op.type === 'delete') {
      newCode = newCode.slice(0, op.from) + newCode.slice(op.to);
    } else if (op.type === 'replace') {
      newCode = newCode.slice(0, op.from) + (op.text || '') + newCode.slice(op.to);
    }
  }
  
  return newCode;
}

function reverseOps(code, ops) {
  let newCode = code;
  const sortedOps = [...ops].sort((a, b) => b.from - a.from);
  
  for (const op of sortedOps) {
    if (op.type === 'insert') {
      newCode = newCode.slice(0, op.from) + newCode.slice(op.from + (op.text?.length || 0));
    } else if (op.type === 'delete') {
      const deletedText = state.code.slice(op.from, op.to);
      newCode = newCode.slice(0, op.from) + deletedText + newCode.slice(op.from);
    } else if (op.type === 'replace') {
      const originalText = state.code.slice(op.from, op.to);
      newCode = newCode.slice(0, op.from) + originalText + newCode.slice(op.from + (op.text?.length || 0));
    }
  }
  
  return newCode;
}

function getLineNumber(code, position) {
  return code.slice(0, position).split('\n').length;
}

function getEditRange(code, ops) {
  if (!ops || ops.length === 0) return null;
  
  let minPos = Infinity;
  let maxPos = -Infinity;
  
  for (const op of ops) {
    minPos = Math.min(minPos, op.from);
    if (op.type === 'insert' && op.text) {
      maxPos = Math.max(maxPos, op.from + op.text.length);
    } else {
      maxPos = Math.max(maxPos, op.to);
    }
  }
  
  return {
    start: getLineNumber(code, minPos),
    end: getLineNumber(code, maxPos),
  };
}

io.on('connection', (socket) => {
  const userId = uuidv4();
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444'];
  const color = colors[state.users.size % colors.length];
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  const name = `${names[state.users.size % names.length]}_${userId.slice(0, 4)}`;

  console.log(`User connected: ${name} (${userId})`);

  state.userHistory.set(userId, []);
  state.userRedo.set(userId, []);

  const user = {
    id: userId,
    name,
    color,
    online: true,
    cursor: null,
    editRange: null,
  };

  state.users.set(userId, user);

  socket.emit('init', {
    userId,
    userName: name,
    userColor: color,
    code: state.code,
    version: state.version,
    users: Array.from(state.users.values()),
    history: state.history,
    snapshots: state.snapshots,
  });

  socket.broadcast.emit('userJoin', { user });

  socket.on('edit', ({ userId: editUserId, ops }) => {
    const newCode = applyOps(state.code, ops);
    
    state.version++;
    state.code = newCode;
    
    const historyEntry = {
      version: state.version,
      code: newCode,
      timestamp: Date.now(),
      userId: editUserId,
      ops,
    };
    
    state.history.push(historyEntry);
    if (state.history.length > MAX_HISTORY) {
      state.history.shift();
    }

    const userHistory = state.userHistory.get(editUserId) || [];
    userHistory.push(ops);
    if (userHistory.length > MAX_USER_HISTORY) {
      userHistory.shift();
    }
    state.userHistory.set(editUserId, userHistory);
    state.userRedo.set(editUserId, []);

    const editRange = getEditRange(newCode, ops);
    const editUser = state.users.get(editUserId);
    if (editUser) {
      editUser.editRange = editRange;
      state.users.set(editUserId, editUser);
    }

    socket.broadcast.emit('remoteEdit', {
      userId: editUserId,
      ops,
      version: state.version,
      code: newCode,
      editRange,
    });

    io.emit('historyUpdate', { history: state.history });
  });

  socket.on('cursor', ({ userId: cursorUserId, from, to }) => {
    const cursorUser = state.users.get(cursorUserId);
    if (cursorUser) {
      cursorUser.cursor = { from, to };
      state.users.set(cursorUserId, cursorUser);
      
      socket.broadcast.emit('remoteCursor', {
        userId: cursorUserId,
        from,
        to,
      });
    }
  });

  socket.on('undo', ({ userId: undoUserId }) => {
    const userHistory = state.userHistory.get(undoUserId) || [];
    if (userHistory.length === 0) return;

    const lastOps = userHistory.pop();
    state.userHistory.set(undoUserId, userHistory);

    const userRedo = state.userRedo.get(undoUserId) || [];
    userRedo.push(lastOps);
    state.userRedo.set(undoUserId, userRedo);

    const newCode = reverseOps(state.code, lastOps);
    state.version++;
    state.code = newCode;

    const historyEntry = {
      version: state.version,
      code: newCode,
      timestamp: Date.now(),
      userId: undoUserId,
      ops: lastOps,
      undo: true,
    };

    state.history.push(historyEntry);

    io.emit('remoteUndo', {
      userId: undoUserId,
      code: newCode,
      version: state.version,
    });

    io.emit('historyUpdate', { history: state.history });
  });

  socket.on('redo', ({ userId: redoUserId }) => {
    const userRedo = state.userRedo.get(redoUserId) || [];
    if (userRedo.length === 0) return;

    const redoOps = userRedo.pop();
    state.userRedo.set(redoUserId, userRedo);

    const newCode = applyOps(state.code, redoOps);
    state.version++;
    state.code = newCode;

    const userHistory = state.userHistory.get(redoUserId) || [];
    userHistory.push(redoOps);
    state.userHistory.set(redoUserId, userHistory);

    const historyEntry = {
      version: state.version,
      code: newCode,
      timestamp: Date.now(),
      userId: redoUserId,
      ops: redoOps,
      redo: true,
    };

    state.history.push(historyEntry);

    io.emit('remoteUndo', {
      userId: redoUserId,
      code: newCode,
      version: state.version,
    });

    io.emit('historyUpdate', { history: state.history });
  });

  socket.on('saveSnapshot', ({ name, code, userId: snapshotUserId }) => {
    const snapshot = {
      id: uuidv4(),
      name,
      code,
      timestamp: Date.now(),
      userId: snapshotUserId,
    };

    state.snapshots.push(snapshot);

    io.emit('snapshotSaved', { snapshot });
  });

  socket.on('getHistory', () => {
    socket.emit('historyUpdate', { history: state.history });
  });

  socket.on('getSnapshots', () => {
    socket.emit('snapshotsUpdate', { snapshots: state.snapshots });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${name} (${userId})`);
    
    const disconnectUser = state.users.get(userId);
    if (disconnectUser) {
      disconnectUser.online = false;
      state.users.set(userId, disconnectUser);
      
      socket.broadcast.emit('userLeave', { userId });
    }

    setTimeout(() => {
      state.users.delete(userId);
      state.userHistory.delete(userId);
      state.userRedo.delete(userId);
    }, 5000);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:5173`);
});
