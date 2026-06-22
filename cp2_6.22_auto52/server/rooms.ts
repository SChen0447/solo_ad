import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { rooms, orders, randomDelay } from './store';
import type { Branch, Room, Order } from './types';

export const getRooms = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const branch = req.query.branch as Branch;

  if (!branch) {
    res.status(400).json({ error: '缺少分店参数' });
    return;
  }

  const branchRooms = rooms.filter((r) => r.branch === branch);
  res.json(branchRooms);
};

export const getRoom = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { id } = req.params;
  const room = rooms.find((r) => r.id === id);

  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }

  res.json(room);
};

export const checkIn = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { id } = req.params;
  const { guest, days, deposit } = req.body;
  const username = (req as Request & { username: string }).username;

  const room = rooms.find((r) => r.id === id);

  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }

  if (room.status !== 'vacant') {
    res.status(400).json({ error: '房间不可用' });
    return;
  }

  if (!guest?.name || !guest?.phone || !guest?.idCard || !days) {
    res.status(400).json({ error: '信息不完整' });
    return;
  }

  const idCardRegex = /^\d{17}[\dXx]$/;
  if (!idCardRegex.test(guest.idCard)) {
    res.status(400).json({ error: '身份证号格式不正确' });
    return;
  }

  const orderId = uuidv4();
  const checkInTime = Date.now();
  const roomRate = 200;

  const order: Order = {
    id: orderId,
    roomId: room.id,
    branch: room.branch,
    guest,
    checkInTime,
    days,
    roomRate,
    consumptions: [],
    totalAmount: roomRate * days,
    deposit: deposit || 200,
    status: 'active',
  };

  orders.push(order);

  room.status = 'occupied';
  room.guest = guest;
  room.checkInTime = checkInTime;
  room.checkOutTime = checkInTime + days * 24 * 60 * 60 * 1000;
  room.days = days;
  room.deposit = deposit || 200;
  room.orderId = orderId;

  res.json({ room, order, operator: username });
};

export const checkOut = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { id } = req.params;
  const { paymentMethod } = req.body;

  const room = rooms.find((r) => r.id === id);

  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }

  if (room.status !== 'occupied') {
    res.status(400).json({ error: '房间未在住' });
    return;
  }

  const order = orders.find((o) => o.id === room.orderId);

  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }

  if (!['cash', 'wechat', 'alipay'].includes(paymentMethod)) {
    res.status(400).json({ error: '无效的支付方式' });
    return;
  }

  order.status = 'settled';
  order.paymentMethod = paymentMethod;
  order.settledAt = Date.now();

  room.status = 'vacant';
  room.guest = undefined;
  room.checkInTime = undefined;
  room.checkOutTime = undefined;
  room.days = undefined;
  room.deposit = undefined;
  room.orderId = undefined;

  res.json({ room, order });
};

export const updateRoomStatus = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { id } = req.params;
  const { status } = req.body;

  const room = rooms.find((r) => r.id === id);

  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }

  if (!['vacant', 'cleaning', 'maintenance'].includes(status)) {
    res.status(400).json({ error: '无效的状态' });
    return;
  }

  room.status = status as Room['status'];
  res.json(room);
};
