"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const PORT = 3001;
const MAX_SNAPSHOTS = 50;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
const rooms = new Map();
function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            elements: new Map(),
            users: new Map(),
            snapshots: []
        });
    }
    return rooms.get(roomId);
}
function getElementsArray(room) {
    return Array.from(room.elements.values());
}
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentRoomId = null;
    let currentUserInfo = null;
    socket.on('joinRoom', (data) => {
        const { roomId, userInfo } = data;
        currentRoomId = roomId;
        currentUserInfo = userInfo;
        const room = getOrCreateRoom(roomId);
        room.users.set(socket.id, userInfo);
        socket.join(roomId);
        console.log(`User ${userInfo.name} joined room ${roomId}`);
        const initMessage = {
            type: 'init',
            elements: getElementsArray(room),
            roomId
        };
        socket.emit('init', initMessage);
        socket.to(roomId).emit('userJoined', userInfo);
        const onlineUsers = Array.from(room.users.values());
        io.to(roomId).emit('onlineUsers', onlineUsers);
    });
    socket.on('requestInitSync', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            const initMessage = {
                type: 'init',
                elements: getElementsArray(room),
                roomId: data.roomId
            };
            socket.emit('init', initMessage);
        }
    });
    socket.on('draw', (data) => {
        if (!currentRoomId)
            return;
        const room = getOrCreateRoom(currentRoomId);
        switch (data.type) {
            case 'draw':
                room.elements.set(data.element.id, data.element);
                break;
            case 'update':
                room.elements.set(data.element.id, data.element);
                break;
            case 'delete':
                room.elements.delete(data.element.id);
                break;
        }
        socket.to(currentRoomId).emit('draw', data);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (currentRoomId && currentUserInfo) {
            const room = rooms.get(currentRoomId);
            if (room) {
                room.users.delete(socket.id);
                socket.to(currentRoomId).emit('userLeft', socket.id);
                const onlineUsers = Array.from(room.users.values());
                io.to(currentRoomId).emit('onlineUsers', onlineUsers);
                if (room.users.size === 0 && room.elements.size === 0) {
                    rooms.delete(currentRoomId);
                    console.log(`Room ${currentRoomId} deleted (empty)`);
                }
            }
        }
    });
});
app.post('/api/board/:roomId/snapshot', (req, res) => {
    try {
        const { roomId } = req.params;
        const { elements, thumbnail } = req.body;
        if (!Array.isArray(elements)) {
            return res.status(400).json({ error: 'Invalid elements data' });
        }
        const room = getOrCreateRoom(roomId);
        elements.forEach((el) => {
            room.elements.set(el.id, el);
        });
        const snapshot = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            elements: [...elements],
            thumbnail
        };
        room.snapshots.unshift(snapshot);
        if (room.snapshots.length > MAX_SNAPSHOTS) {
            room.snapshots = room.snapshots.slice(0, MAX_SNAPSHOTS);
        }
        console.log(`Snapshot saved for room ${roomId}: ${snapshot.id}`);
        res.json(snapshot);
    }
    catch (error) {
        console.error('Error saving snapshot:', error);
        res.status(500).json({ error: 'Failed to save snapshot' });
    }
});
app.get('/api/board/:roomId/snapshots', (req, res) => {
    try {
        const { roomId } = req.params;
        const room = getOrCreateRoom(roomId);
        res.json(room.snapshots);
    }
    catch (error) {
        console.error('Error getting snapshots:', error);
        res.status(500).json({ error: 'Failed to get snapshots' });
    }
});
app.get('/api/board/:roomId/restore', (req, res) => {
    try {
        const { roomId } = req.params;
        const { snapshot } = req.query;
        if (!snapshot || typeof snapshot !== 'string') {
            return res.status(400).json({ error: 'Snapshot ID required' });
        }
        const room = getOrCreateRoom(roomId);
        const targetSnapshot = room.snapshots.find(s => s.id === snapshot);
        if (!targetSnapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
        room.elements.clear();
        targetSnapshot.elements.forEach(el => {
            room.elements.set(el.id, el);
        });
        io.to(roomId).emit('init', {
            type: 'init',
            elements: targetSnapshot.elements,
            roomId
        });
        console.log(`Snapshot restored for room ${roomId}: ${snapshot}`);
        res.json(targetSnapshot);
    }
    catch (error) {
        console.error('Error restoring snapshot:', error);
        res.status(500).json({ error: 'Failed to restore snapshot' });
    }
});
app.get('/api/board/:roomId/state', (req, res) => {
    try {
        const { roomId } = req.params;
        const room = getOrCreateRoom(roomId);
        res.json({
            roomId,
            elementCount: room.elements.size,
            userCount: room.users.size,
            snapshotCount: room.snapshots.length,
            elements: getElementsArray(room)
        });
    }
    catch (error) {
        console.error('Error getting board state:', error);
        res.status(500).json({ error: 'Failed to get board state' });
    }
});
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        rooms: rooms.size
    });
});
httpServer.listen(PORT, () => {
    console.log(`🚀 Team Ideation Board Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO server ready for real-time collaboration`);
    console.log(`📸 Max snapshots per room: ${MAX_SNAPSHOTS}`);
});
