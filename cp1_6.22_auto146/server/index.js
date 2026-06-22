import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

let devices = [];
let scenes = [];

const deviceTypes = ['light', 'ac', 'curtain', 'temp_sensor', 'humidity_sensor', 'motion_sensor'];

const generateMockDevices = () => {
  const mockDevices = [
    { id: uuidv4(), name: '客厅主灯', type: 'light', online: true, status: 'on', value: 80 },
    { id: uuidv4(), name: '卧室灯', type: 'light', online: true, status: 'off', value: 0 },
    { id: uuidv4(), name: '客厅空调', type: 'ac', online: true, status: 'off', value: 26 },
    { id: uuidv4(), name: '卧室空调', type: 'ac', online: false, status: 'off', value: 25 },
    { id: uuidv4(), name: '客厅窗帘', type: 'curtain', online: true, status: 'open', value: 100 },
    { id: uuidv4(), name: '卧室窗帘', type: 'curtain', online: true, status: 'closed', value: 0 },
    { id: uuidv4(), name: '客厅温度传感器', type: 'temp_sensor', online: true, status: 'on', value: 25 },
    { id: uuidv4(), name: '卧室温度传感器', type: 'temp_sensor', online: true, status: 'on', value: 24 },
    { id: uuidv4(), name: '客厅湿度传感器', type: 'humidity_sensor', online: true, status: 'on', value: 55 },
    { id: uuidv4(), name: '门口运动传感器', type: 'motion_sensor', online: true, status: 'on', value: 0 },
  ];
  for (let i = 0; i < 40; i++) {
    const type = deviceTypes[i % deviceTypes.length];
    mockDevices.push({
      id: uuidv4(),
      name: `设备${i + 1}`,
      type,
      online: Math.random() > 0.2,
      status: Math.random() > 0.5 ? (type === 'curtain' ? 'open' : 'on') : (type === 'curtain' ? 'closed' : 'off'),
      value: type.includes('sensor') ? Math.floor(Math.random() * 100) : Math.floor(Math.random() * 100)
    });
  }
  return mockDevices;
};

devices = generateMockDevices();

const defaultScenes = [
  {
    id: uuidv4(),
    name: '回家模式',
    nodes: [
      { id: 'n1', type: 'condition', subtype: 'motion', label: '有人移动', x: 100, y: 200, params: { location: '门口' } },
      { id: 'n2', type: 'action', subtype: 'light_on', label: '开灯', x: 400, y: 150, params: { deviceId: '' } },
      { id: 'n3', type: 'action', subtype: 'ac_on', label: '打开空调', x: 400, y: 280, params: { deviceId: '' } }
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' },
      { id: 'c2', from: 'n1', to: 'n3' }
    ]
  },
  {
    id: uuidv4(),
    name: '高温自动降温',
    nodes: [
      { id: 'n1', type: 'condition', subtype: 'temp_high', label: '温度 > 30°C', x: 100, y: 200, params: { threshold: 30 } },
      { id: 'n2', type: 'action', subtype: 'ac_on', label: '打开空调', x: 400, y: 200, params: { deviceId: '' } }
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' }
    ]
  }
];
scenes = defaultScenes;

const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};

setInterval(() => {
  devices = devices.map((d) => {
    if (d.type === 'temp_sensor' || d.type === 'humidity_sensor') {
      const change = (Math.random() - 0.5) * 2;
      const newValue = Math.max(0, Math.min(100, Math.round((d.value + change) * 10) / 10));
      if (Math.abs(newValue - d.value) >= 0.5) {
        broadcast({ type: 'device_update', device: { ...d, value: newValue } });
        return { ...d, value: newValue };
      }
    }
    if (d.type === 'motion_sensor') {
      if (Math.random() > 0.9) {
        const newValue = d.value === 1 ? 0 : 1;
        broadcast({ type: 'device_update', device: { ...d, value: newValue } });
        return { ...d, value: newValue };
      }
    }
    return d;
  });
}, 5000);

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'initial', devices }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.get('/api/devices', (req, res) => {
  res.json(devices);
});

app.get('/api/devices/:id', (req, res) => {
  const device = devices.find((d) => d.id === req.params.id);
  if (!device) return res.status(404).json({ error: '设备不存在' });
  res.json(device);
});

app.post('/api/devices', (req, res) => {
  const { name, type, status, value } = req.body;
  if (!name || name.length < 3 || name.length > 20) {
    return res.status(400).json({ error: '设备名称必须在3-20个字符之间' });
  }
  if (!deviceTypes.includes(type)) {
    return res.status(400).json({ error: '无效的设备类型' });
  }
  const newDevice = {
    id: uuidv4(),
    name,
    type,
    online: true,
    status: status || (type === 'curtain' ? 'closed' : 'off'),
    value: value !== undefined ? value : (type.includes('sensor') ? 0 : 0)
  };
  devices.unshift(newDevice);
  broadcast({ type: 'device_add', device: newDevice });
  res.status(201).json(newDevice);
});

app.put('/api/devices/:id', (req, res) => {
  const index = devices.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '设备不存在' });
  const { name, type, status, value, online } = req.body;
  if (name && (name.length < 3 || name.length > 20)) {
    return res.status(400).json({ error: '设备名称必须在3-20个字符之间' });
  }
  devices[index] = { ...devices[index], ...req.body };
  broadcast({ type: 'device_update', device: devices[index] });
  res.json(devices[index]);
});

app.delete('/api/devices/:id', (req, res) => {
  const index = devices.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '设备不存在' });
  const deleted = devices.splice(index, 1)[0];
  broadcast({ type: 'device_delete', deviceId: deleted.id });
  res.json({ message: '设备已删除' });
});

app.get('/api/scenes', (req, res) => {
  res.json(scenes);
});

app.get('/api/scenes/:id', (req, res) => {
  const scene = scenes.find((s) => s.id === req.params.id);
  if (!scene) return res.status(404).json({ error: '场景不存在' });
  res.json(scene);
});

app.post('/api/scenes', (req, res) => {
  const { name, nodes, connections } = req.body;
  if (!name) return res.status(400).json({ error: '场景名称不能为空' });
  const newScene = { id: uuidv4(), name, nodes: nodes || [], connections: connections || [] };
  scenes.push(newScene);
  res.status(201).json(newScene);
});

app.put('/api/scenes/:id', (req, res) => {
  const index = scenes.findIndex((s) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '场景不存在' });
  scenes[index] = { ...scenes[index], ...req.body };
  res.json(scenes[index]);
});

app.delete('/api/scenes/:id', (req, res) => {
  const index = scenes.findIndex((s) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '场景不存在' });
  scenes.splice(index, 1);
  res.json({ message: '场景已删除' });
});

const evaluateScene = (scene, currentDevices) => {
  const conditionNodes = scene.nodes.filter((n) => n.type === 'condition');
  const actionNodes = scene.nodes.filter((n) => n.type === 'action');
  const changes = [];

  let allConditionsMet = conditionNodes.length > 0;
  for (const cond of conditionNodes) {
    let met = false;
    switch (cond.subtype) {
      case 'temp_high':
        met = currentDevices.some((d) => d.type === 'temp_sensor' && d.value > (cond.params?.threshold || 30));
        break;
      case 'temp_low':
        met = currentDevices.some((d) => d.type === 'temp_sensor' && d.value < (cond.params?.threshold || 18));
        break;
      case 'humidity_high':
        met = currentDevices.some((d) => d.type === 'humidity_sensor' && d.value > (cond.params?.threshold || 70));
        break;
      case 'humidity_low':
        met = currentDevices.some((d) => d.type === 'humidity_sensor' && d.value < (cond.params?.threshold || 30));
        break;
      case 'device_on':
        met = currentDevices.some((d) => d.id === cond.params?.deviceId && (d.status === 'on' || d.status === 'open'));
        break;
      case 'motion':
        met = currentDevices.some((d) => d.type === 'motion_sensor' && d.value === 1);
        break;
      default:
        met = true;
    }
    if (!met) {
      allConditionsMet = false;
      break;
    }
  }

  if (allConditionsMet || conditionNodes.length === 0) {
    for (const action of actionNodes) {
      let targetDevice = null;
      if (action.params?.deviceId) {
        targetDevice = currentDevices.find((d) => d.id === action.params.deviceId);
      }
      if (!targetDevice) {
        targetDevice = currentDevices.find((d) => {
          if (action.subtype?.startsWith('light')) return d.type === 'light';
          if (action.subtype?.startsWith('ac')) return d.type === 'ac';
          if (action.subtype?.startsWith('curtain')) return d.type === 'curtain';
          return false;
        });
      }
      if (targetDevice) {
        const oldStatus = targetDevice.status;
        const oldValue = targetDevice.value;
        let newStatus = oldStatus;
        let newValue = oldValue;
        let message = '';

        switch (action.subtype) {
          case 'light_on':
            newStatus = 'on';
            newValue = 100;
            message = `${targetDevice.name}：已开启`;
            break;
          case 'light_off':
            newStatus = 'off';
            newValue = 0;
            message = `${targetDevice.name}：已关闭`;
            break;
          case 'ac_on':
            newStatus = 'on';
            newValue = 26;
            message = `${targetDevice.name}：已开启，温度设为26°C`;
            break;
          case 'ac_off':
            newStatus = 'off';
            message = `${targetDevice.name}：已关闭`;
            break;
          case 'curtain_open':
            newStatus = 'open';
            newValue = 100;
            message = `${targetDevice.name}：已打开`;
            break;
          case 'curtain_close':
            newStatus = 'closed';
            newValue = 0;
            message = `${targetDevice.name}：已关闭`;
            break;
        }

        if (oldStatus !== newStatus || oldValue !== newValue) {
          const idx = devices.findIndex((d) => d.id === targetDevice.id);
          if (idx !== -1) {
            devices[idx] = { ...devices[idx], status: newStatus, value: newValue };
            broadcast({ type: 'device_update', device: devices[idx] });
          }
          changes.push({
            deviceId: targetDevice.id,
            deviceName: targetDevice.name,
            deviceType: targetDevice.type,
            oldStatus,
            newStatus,
            oldValue,
            newValue,
            message
          });
        }
      }
    }
  }

  return { changes, conditionsMet: allConditionsMet || conditionNodes.length === 0 };
};

app.post('/api/scenes/:id/execute', (req, res) => {
  const scene = scenes.find((s) => s.id === req.params.id);
  if (!scene) return res.status(404).json({ error: '场景不存在' });
  const result = evaluateScene(scene, devices);
  res.json(result);
});

app.post('/api/scenes/:id/simulate', (req, res) => {
  const scene = scenes.find((s) => s.id === req.params.id);
  if (!scene) return res.status(404).json({ error: '场景不存在' });
  const result = evaluateScene(scene, devices);
  res.json(result);
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Smart Home Server running on port ${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
});
