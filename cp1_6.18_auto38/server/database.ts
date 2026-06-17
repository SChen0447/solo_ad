import { v4 as uuidv4 } from 'uuid';
import { Medicine, Reminder, Member } from './types';

const ownerId = uuidv4();
const member2Id = uuidv4();
const member3Id = uuidv4();

export const members: Member[] = [
  {
    id: ownerId,
    name: '家长',
    color: '#4A90D9',
    isOwner: true,
    createdAt: new Date().toISOString()
  },
  {
    id: member2Id,
    name: '妈妈',
    color: '#E67E9B',
    isOwner: false,
    createdAt: new Date().toISOString()
  },
  {
    id: member3Id,
    name: '小明',
    color: '#52C41A',
    isOwner: false,
    createdAt: new Date().toISOString()
  }
];

const now = new Date();
const nearExpiry = new Date(now);
nearExpiry.setDate(now.getDate() + 3);
const expired = new Date(now);
expired.setDate(now.getDate() - 2);
const futureExpiry = new Date(now);
futureExpiry.setMonth(now.getMonth() + 6);

export let medicines: Medicine[] = [
  {
    id: uuidv4(),
    name: '布洛芬胶囊',
    specification: '0.3g*24粒',
    quantity: 18,
    expiryDate: nearExpiry.toISOString().split('T')[0],
    usage: '每次1粒，每日3次，饭后服用',
    memberIds: [ownerId, member2Id],
    createdBy: ownerId,
    createdAt: new Date().toISOString(),
    dosageSchedule: {
      timesPerDay: 3,
      startTime: '08:00',
      dosageAmount: '1粒'
    }
  },
  {
    id: uuidv4(),
    name: '复方感冒灵颗粒',
    specification: '10g*9袋',
    quantity: 5,
    expiryDate: expired.toISOString().split('T')[0],
    usage: '每次1袋，每日3次，开水冲服',
    memberIds: [ownerId, member3Id],
    createdBy: ownerId,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: '阿莫西林胶囊',
    specification: '0.25g*24粒',
    quantity: 24,
    expiryDate: futureExpiry.toISOString().split('T')[0],
    usage: '每次2粒，每日3次',
    memberIds: [member2Id],
    createdBy: ownerId,
    createdAt: new Date().toISOString(),
    dosageSchedule: {
      timesPerDay: 3,
      startTime: '08:00',
      dosageAmount: '2粒'
    }
  },
  {
    id: uuidv4(),
    name: '维生素C片',
    specification: '100mg*100片',
    quantity: 85,
    expiryDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split('T')[0],
    usage: '每次1片，每日1次',
    memberIds: [ownerId, member2Id, member3Id],
    createdBy: ownerId,
    createdAt: new Date().toISOString(),
    dosageSchedule: {
      timesPerDay: 1,
      startTime: '08:00',
      dosageAmount: '1片'
    }
  },
  {
    id: uuidv4(),
    name: '蒙脱石散',
    specification: '3g*10袋',
    quantity: 10,
    expiryDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString().split('T')[0],
    usage: '每次1袋，每日3次',
    memberIds: [member3Id],
    createdBy: ownerId,
    createdAt: new Date().toISOString()
  }
];

export let reminders: Reminder[] = [
  {
    id: uuidv4(),
    type: 'expiry',
    medicineId: medicines[0].id,
    medicineName: medicines[0].name,
    severity: 'near',
    scheduledTime: new Date().toISOString(),
    status: 'pending',
    message: '布洛芬胶囊将在3天后过期，请及时使用或更换',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    type: 'expiry',
    medicineId: medicines[1].id,
    medicineName: medicines[1].name,
    severity: 'expired',
    scheduledTime: new Date().toISOString(),
    status: 'pending',
    message: '复方感冒灵颗粒已过期，请立即丢弃并更换新药',
    createdAt: new Date().toISOString()
  }
];
