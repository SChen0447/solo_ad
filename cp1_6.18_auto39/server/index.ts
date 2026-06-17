import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type { Device, QueueItem, DeviceStatus, DeviceWithQueue } from '../src/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

const devices: Device[] = [
  { id: 'oven-1', name: '烤箱 1号', status: 'in-use', remainingMinutes: 15, currentUser: '张小明', totalDuration: 30, startTime: Date.now() - 15 * 60 * 1000 },
  { id: 'oven-2', name: '烤箱 2号', status: 'idle', remainingMinutes: 0 },
  { id: 'induction-1', name: '电磁炉 A', status: 'idle', remainingMinutes: 0 },
  { id: 'induction-2', name: '电磁炉 B', status: 'in-use', remainingMinutes: 8, currentUser: '李大厨', totalDuration: 20, startTime: Date.now() - 12 * 60 * 1000 },
  { id: 'fryer', name: '空气炸锅', status: 'maintenance', remainingMinutes: 0, maintenanceReason: '定期清洁保养' },
  { id: 'mixer', name: '厨师机', status: 'idle', remainingMinutes: 0 },
];

const queues: Map<string, QueueItem[]> = new Map();
devices.forEach((d) => queues.set(d.id, []));

const onlineUsers: Map<string, { nickname?: string; isAdmin: boolean }> = new Map();

function recalculateEstimatedTimes(deviceId: string): void {
  const queue = queues.get(deviceId) || [];
  const device = devices.find((d) => d.id === deviceId);
  if (!device) return;

  let currentEndTime = Date.now();
  if (device.status === 'in-use') {
    currentEndTime = Date.now() + device.remainingMinutes * 60 * 1000;
  }

  queue.forEach((item) => {
    item.estimatedStartTime = currentEndTime;
    currentEndTime += item.duration * 60 * 1000;
  });
}

function getDeviceWithQueue(deviceId: string): DeviceWithQueue | undefined {
  const device = devices.find((d) => d.id === deviceId);
  if (!device) return undefined;
  return { ...device, queue: queues.get(deviceId) || [] };
}

function broadcastQueueUpdate(deviceId: string): void {
  recalculateEstimatedTimes(deviceId);
  const queue = queues.get(deviceId) || [];
  io.emit('queue:update', { deviceId, queue });
}

function broadcastDeviceStatus(deviceId: string): void {
  const device = devices.find((d) => d.id === deviceId);
  if (device) {
    io.emit('device:status', {
      deviceId,
      status: device.status,
      remainingMinutes: device.remainingMinutes,
      currentUser: device.currentUser,
      maintenanceReason: device.maintenanceReason,
    });
  }
}

function broadcastOnlineCount(): void {
  io.emit('users:count', { count: onlineUsers.size });
}

function setDeviceStatus(deviceId: string, status: DeviceStatus, options?: { currentUser?: string; duration?: number; reason?: string }): void {
  const device = devices.find((d) => d.id === deviceId);
  if (!device) return;

  const prevStatus = device.status;
  device.status = status;

  if (status === 'in-use') {
    device.currentUser = options?.currentUser;
    device.totalDuration = options?.duration || 30;
    device.remainingMinutes = options?.duration || 30;
    device.startTime = Date.now();
    device.maintenanceReason = undefined;
  } else if (status === 'idle') {
    device.currentUser = undefined;
    device.remainingMinutes = 0;
    device.totalDuration = undefined;
    device.startTime = undefined;
    device.maintenanceReason = undefined;
  } else if (status === 'maintenance') {
    device.currentUser = undefined;
    device.remainingMinutes = 0;
    device.totalDuration = undefined;
    device.startTime = undefined;
    device.maintenanceReason = options?.reason || '维护中';
  }

  broadcastDeviceStatus(deviceId);

  if (prevStatus === 'in-use' && status === 'idle') {
    const queue = queues.get(deviceId) || [];
    if (queue.length > 0) {
      const firstItem = queue[0];
      if (firstItem.socketId) {
        io.to(firstItem.socketId).emit('device:free', {
          deviceId,
          deviceName: device.name,
        });
      }
    }
  }

  if (status === 'idle') {
    broadcastQueueUpdate(deviceId);
  }
}

function processDeviceTimer(): void {
  devices.forEach((device) => {
    if (device.status === 'in-use' && device.remainingMinutes > 0) {
      if (device.startTime && device.totalDuration) {
        const elapsed = (Date.now() - device.startTime) / (60 * 1000);
        const remaining = Math.max(0, device.totalDuration - elapsed);
        device.remainingMinutes = Math.ceil(remaining);

        if (device.remainingMinutes <= 0) {
          setDeviceStatus(device.id, 'idle');
          const queue = queues.get(device.id) || [];
          if (queue.length > 0) {
            const nextUser = queue.shift()!;
            setDeviceStatus(device.id, 'in-use', {
              currentUser: nextUser.nickname,
              duration: nextUser.duration,
            });
            broadcastQueueUpdate(device.id);
          }
        } else {
          broadcastDeviceStatus(device.id);
        }
      }
    }
  });
}

setInterval(processDeviceTimer, 30 * 1000);

app.get('/api/devices', (_req: Request, res: Response) => {
  const result = devices.map((d) => getDeviceWithQueue(d.id)!);
  res.json(result);
});

app.get('/api/devices/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const device = getDeviceWithQueue(id);
  if (!device) {
    res.status(404).json({ error: '设备不存在' });
    return;
  }
  res.json(device);
});

app.post('/api/devices/:id/queue', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nickname, duration, socketId } = req.body;

  if (!nickname || !duration || duration < 5 || duration > 60) {
    res.status(400).json({ error: '无效的预约参数' });
    return;
  }

  const device = devices.find((d) => d.id === id);
  if (!device) {
    res.status(404).json({ error: '设备不存在' });
    return;
  }

  if (device.status === 'maintenance') {
    res.status(400).json({ error: '设备维护中，无法预约' });
    return;
  }

  const queue = queues.get(id) || [];

  if (device.status === 'idle' && queue.length === 0) {
    setDeviceStatus(id, 'in-use', { currentUser: nickname, duration });
    res.json({
      message: '设备空闲，立即使用',
      isImmediate: true,
    });
    return;
  }

  const newItem: QueueItem = {
    id: uuidv4(),
    nickname,
    duration,
    estimatedStartTime: Date.now(),
    socketId,
  };

  queue.push(newItem);
  queues.set(id, queue);
  broadcastQueueUpdate(id);

  res.status(201).json({
    message: '预约成功',
    queueItem: newItem,
    position: queue.length,
  });
});

app.delete('/api/devices/:id/queue/:queueId', (req: Request, res: Response) => {
  const { id, queueId } = req.params;
  const queue = queues.get(id) || [];
  const index = queue.findIndex((item) => item.id === queueId);

  if (index === -1) {
    res.status(404).json({ error: '排队项不存在' });
    return;
  }

  queue.splice(index, 1);
  queues.set(id, queue);
  broadcastQueueUpdate(id);

  res.json({ message: '取消成功' });
});

app.put('/api/devices/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, currentUser, duration, reason, isAdmin } = req.body;

  if (!isAdmin) {
    res.status(403).json({ error: '无权限操作' });
    return;
  }

  const device = devices.find((d) => d.id === id);
  if (!device) {
    res.status(404).json({ error: '设备不存在' });
    return;
  }

  if (status !== 'idle' && status !== 'in-use' && status !== 'maintenance') {
    res.status(400).json({ error: '无效的状态值' });
    return;
  }

  setDeviceStatus(id, status, { currentUser, duration, reason });
  broadcastQueueUpdate(id);

  res.json({ message: '状态已更新', device });
});

io.on('connection', (socket: Socket) => {
  onlineUsers.set(socket.id, { isAdmin: false });
  broadcastOnlineCount();

  socket.on('join', (data: { nickname?: string; isAdmin?: boolean }) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.nickname = data.nickname;
      user.isAdmin = !!data.isAdmin;
      onlineUsers.set(socket.id, user);
      broadcastOnlineCount();
    }
  });

  socket.on('subscribe:device', (_data: { deviceId: string }) => {
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    broadcastOnlineCount();

    queues.forEach((queue, deviceId) => {
      const index = queue.findIndex((item) => item.socketId === socket.id);
      if (index !== -1) {
        queue.splice(index, 1);
        broadcastQueueUpdate(deviceId);
      }
    });
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`REST API: http://localhost:${PORT}/api`);
  console.log(`Socket.io: ws://localhost:${PORT}`);
});
