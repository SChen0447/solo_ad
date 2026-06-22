import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { orders, rooms, menuItems, randomDelay } from './store';
import type { ConsumptionItem } from './types';

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { branch, status } = req.query;

  let filtered = orders;
  if (branch) {
    filtered = filtered.filter((o) => o.branch === branch);
  }
  if (status) {
    filtered = filtered.filter((o) => o.status === status);
  }

  res.json(filtered);
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { id } = req.params;
  const order = orders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }

  res.json(order);
};

export const getOrderByRoom = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { roomId } = req.params;
  const order = orders.find((o) => o.roomId === roomId && o.status === 'active');

  if (!order) {
    res.status(404).json({ error: '该房间无活跃订单' });
    return;
  }

  res.json(order);
};

export const addConsumption = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { id } = req.params;
  const { menuItemId, quantity } = req.body;
  const username = (req as Request & { username: string }).username;

  const order = orders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }

  if (order.status !== 'active') {
    res.status(400).json({ error: '订单已结算' });
    return;
  }

  const menuItem = menuItems.find((m) => m.id === menuItemId);

  if (!menuItem) {
    res.status(400).json({ error: '商品不存在' });
    return;
  }

  const consumption: ConsumptionItem = {
    id: uuidv4(),
    menuItemId,
    name: menuItem.name,
    price: menuItem.price,
    quantity: quantity || 1,
    timestamp: Date.now(),
    operator: username,
  };

  order.consumptions.push(consumption);
  order.totalAmount += menuItem.price * (quantity || 1);

  res.json({ order, consumption });
};

export const getMenuItems = async (_req: Request, res: Response): Promise<void> => {
  await randomDelay();
  res.json(menuItems);
};

export const calculateBill = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { id } = req.params;
  const order = orders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }

  const room = rooms.find((r) => r.id === order.roomId);
  const roomCharge = order.roomRate * order.days;
  const consumptionTotal = order.consumptions.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = roomCharge + consumptionTotal;

  res.json({
    orderId: order.id,
    guest: order.guest,
    checkInTime: order.checkInTime,
    days: order.days,
    roomNumber: room?.roomNumber,
    roomCharge,
    consumptions: order.consumptions,
    consumptionTotal,
    deposit: order.deposit,
    totalAmount: total,
    refund: order.deposit > total ? order.deposit - total : 0,
    receivable: total > order.deposit ? total - order.deposit : 0,
  });
};
