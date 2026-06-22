import express from 'express';
import cors from 'cors';
import { login, register, authMiddleware } from './login';
import { getRooms, getRoom, checkIn, checkOut, updateRoomStatus } from './rooms';
import {
  getOrders,
  getOrder,
  getOrderByRoom,
  addConsumption,
  getMenuItems,
  calculateBill,
} from './orders';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

app.get('/api/rooms', authMiddleware, getRooms);
app.get('/api/rooms/:id', authMiddleware, getRoom);
app.post('/api/rooms/:id/checkin', authMiddleware, checkIn);
app.post('/api/rooms/:id/checkout', authMiddleware, checkOut);
app.put('/api/rooms/:id/status', authMiddleware, updateRoomStatus);

app.get('/api/orders', authMiddleware, getOrders);
app.get('/api/orders/:id', authMiddleware, getOrder);
app.get('/api/orders/room/:roomId', authMiddleware, getOrderByRoom);
app.post('/api/orders/:id/consumption', authMiddleware, addConsumption);
app.get('/api/orders/:id/bill', authMiddleware, calculateBill);

app.get('/api/menu', authMiddleware, getMenuItems);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
