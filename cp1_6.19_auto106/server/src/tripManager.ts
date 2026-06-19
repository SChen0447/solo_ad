import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { Trip, Member, Schedule, Expense, ServerMessage } from '../../shared/types';

interface Connection {
  ws: WebSocket;
  memberId: string;
  tripId: string;
}

class TripManager {
  private trips: Map<string, Trip> = new Map();
  private connections: Connection[] = [];

  constructor() {
    const defaultTripId = 'trip-demo-001';
    const ownerId = 'member-owner-001';
    const today = new Date();
    const day1 = new Date(today);
    const day2 = new Date(today);
    day2.setDate(today.getDate() + 1);
    const dayKey1 = day1.toISOString().split('T')[0];
    const dayKey2 = day2.toISOString().split('T')[0];

    this.trips.set(defaultTripId, {
      id: defaultTripId,
      name: '东京五日游',
      ownerId,
      members: [
        { id: ownerId, username: '行程创建者', online: false, isOwner: true },
      ],
      schedules: [
        {
          id: 'sch-1',
          tripId: defaultTripId,
          dayKey: dayKey1,
          time: '09:00',
          title: '抵达东京成田机场',
          location: { name: '成田国际机场', lat: 35.7720, lng: 140.3929 },
          notes: 'T1航站楼集合',
          budget: 0,
        },
        {
          id: 'sch-2',
          tripId: defaultTripId,
          dayKey: dayKey1,
          time: '14:00',
          title: '浅草寺参观',
          location: { name: '浅草寺', lat: 35.7148, lng: 139.7967 },
          notes: '雷门拍照打卡',
          budget: 0,
        },
        {
          id: 'sch-3',
          tripId: defaultTripId,
          dayKey: dayKey2,
          time: '10:00',
          title: '东京迪士尼乐园',
          location: { name: '东京迪士尼乐园', lat: 35.6329, lng: 139.8807 },
          notes: '全天游玩',
          budget: 800,
        },
      ],
      expenses: [],
    });
  }

  getOrCreateTrip(tripId: string, username: string, isNew?: boolean): Trip {
    let trip = this.trips.get(tripId);
    if (!trip) {
      trip = {
        id: tripId,
        name: `行程-${tripId.slice(-4)}`,
        ownerId: '',
        members: [],
        schedules: [],
        expenses: [],
      };
      this.trips.set(tripId, trip);
    }
    return trip;
  }

  joinTrip(tripId: string, username: string, ws: WebSocket): { member: Member; trip: Trip } {
    const trip = this.getOrCreateTrip(tripId, username);
    let member = trip.members.find((m) => m.username === username);

    if (!member) {
      const isOwner = trip.members.length === 0;
      member = {
        id: uuidv4(),
        username,
        online: true,
        isOwner,
      };
      if (isOwner) {
        trip.ownerId = member.id;
      }
      trip.members.push(member);
      this.broadcastToTrip(tripId, { type: 'MEMBER_JOINED', member });
    } else {
      member.online = true;
      this.broadcastToTrip(tripId, {
        type: 'MEMBER_STATUS_CHANGED',
        memberId: member.id,
        online: true,
      });
    }

    this.connections.push({ ws, memberId: member.id, tripId });

    return { member, trip };
  }

  leaveTrip(ws: WebSocket): void {
    const connIndex = this.connections.findIndex((c) => c.ws === ws);
    if (connIndex === -1) return;

    const { memberId, tripId } = this.connections[connIndex];
    this.connections.splice(connIndex, 1);

    const trip = this.trips.get(tripId);
    if (!trip) return;

    const member = trip.members.find((m) => m.id === memberId);
    if (member) {
      member.online = false;
      this.broadcastToTrip(tripId, {
        type: 'MEMBER_STATUS_CHANGED',
        memberId,
        online: false,
      });
    }
  }

  addSchedule(tripId: string, schedule: Schedule): void {
    const trip = this.trips.get(tripId);
    if (!trip) return;
    trip.schedules.push(schedule);
    this.broadcastToTrip(tripId, { type: 'SCHEDULE_ADDED', schedule });
  }

  updateSchedule(tripId: string, schedule: Schedule): void {
    const trip = this.trips.get(tripId);
    if (!trip) return;
    const idx = trip.schedules.findIndex((s) => s.id === schedule.id);
    if (idx !== -1) {
      trip.schedules[idx] = schedule;
      this.broadcastToTrip(tripId, { type: 'SCHEDULE_UPDATED', schedule });
    }
  }

  deleteSchedule(tripId: string, scheduleId: string): void {
    const trip = this.trips.get(tripId);
    if (!trip) return;
    trip.schedules = trip.schedules.filter((s) => s.id !== scheduleId);
    this.broadcastToTrip(tripId, { type: 'SCHEDULE_DELETED', scheduleId });
  }

  reorderSchedules(tripId: string, dayKey: string, order: string[]): void {
    const trip = this.trips.get(tripId);
    if (!trip) return;

    const daySchedules = trip.schedules.filter((s) => s.dayKey === dayKey);
    const others = trip.schedules.filter((s) => s.dayKey !== dayKey);

    const ordered: Schedule[] = [];
    for (const id of order) {
      const s = daySchedules.find((sch) => sch.id === id);
      if (s) ordered.push(s);
    }
    const remaining = daySchedules.filter((s) => !order.includes(s.id));

    trip.schedules = [...others, ...ordered, ...remaining];
    this.broadcastToTrip(tripId, { type: 'SCHEDULES_REORDERED', dayKey, order });
  }

  addExpense(tripId: string, expense: Expense): void {
    const trip = this.trips.get(tripId);
    if (!trip) return;
    trip.expenses.push(expense);
    this.broadcastToTrip(tripId, { type: 'EXPENSE_ADDED', expense });
  }

  inviteMember(tripId: string, username: string): Member | null {
    const trip = this.trips.get(tripId);
    if (!trip) return null;
    if (trip.members.find((m) => m.username === username)) return null;

    const member: Member = {
      id: uuidv4(),
      username,
      online: false,
      isOwner: false,
    };
    trip.members.push(member);
    this.broadcastToTrip(tripId, { type: 'MEMBER_JOINED', member });
    return member;
  }

  private broadcastToTrip(tripId: string, message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const conn of this.connections) {
      if (conn.tripId === tripId && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(data);
      }
    }
  }
}

export const tripManager = new TripManager();
