import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { medicines, members } from '../database';
import { Medicine } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json(medicines);
});

router.get('/:id', (req: Request, res: Response) => {
  const medicine = medicines.find(m => m.id === req.params.id);
  if (!medicine) {
    return res.status(404).json({ error: '药品未找到' });
  }
  res.json(medicine);
});

router.post('/', (req: Request, res: Response) => {
  const {
    name,
    specification,
    quantity,
    expiryDate,
    usage,
    memberIds,
    createdBy,
    dosageSchedule
  } = req.body as Partial<Medicine> & { createdBy: string };

  if (!name || !specification || quantity === undefined || !expiryDate) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const owner = members.find(m => m.isOwner);
  const newMedicine: Medicine = {
    id: uuidv4(),
    name,
    specification,
    quantity,
    expiryDate,
    usage: usage || '',
    memberIds: memberIds || [],
    createdBy: createdBy || owner?.id || '',
    createdAt: new Date().toISOString(),
    dosageSchedule
  };

  medicines.unshift(newMedicine);
  res.status(201).json(newMedicine);
});

router.put('/:id', (req: Request, res: Response) => {
  const index = medicines.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '药品未找到' });
  }

  const medicine = medicines[index];
  const {
    name,
    specification,
    quantity,
    expiryDate,
    usage,
    memberIds,
    dosageSchedule
  } = req.body as Partial<Medicine>;

  medicines[index] = {
    ...medicine,
    name: name || medicine.name,
    specification: specification || medicine.specification,
    quantity: quantity !== undefined ? quantity : medicine.quantity,
    expiryDate: expiryDate || medicine.expiryDate,
    usage: usage !== undefined ? usage : medicine.usage,
    memberIds: memberIds || medicine.memberIds,
    dosageSchedule: dosageSchedule || medicine.dosageSchedule
  };

  res.json(medicines[index]);
});

router.delete('/:id', (req: Request, res: Response) => {
  const index = medicines.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '药品未找到' });
  }

  const deleted = medicines.splice(index, 1)[0];
  res.json({ message: '删除成功', medicine: deleted });
});

export default router;
