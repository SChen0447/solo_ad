import { create } from 'zustand';
import type { Trip, Member, Schedule, Expense, ServerMessage, ClientMessage } from '../../shared/types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  trip: Trip | null;
  currentMember: Member | null;
  toasts: Toast[];
  ws: WebSocket | null;
  connected: boolean;

  connect: (tripId: string, username: string) => void;
  disconnect: () => void;
  sendMessage: (msg: ClientMessage) => void;

  handleServerMessage: (msg: ServerMessage) => void;

  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

let wsInstance: WebSocket | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  trip: null,
  currentMember: null,
  toasts: [],
  ws: null,
  connected: false,

  connect: (tripId: string, username: string) => {
    if (wsInstance) {
      wsInstance.close();
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsInstance = ws;

    ws.onopen = () => {
      set({ connected: true });
      ws.send(JSON.stringify({ type: 'JOIN_TRIP', tripId, username }));
    };

    ws.onclose = () => {
      set({ connected: false });
    };

    ws.onerror = () => {
      get().showToast('连接失败，请刷新重试', 'error');
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        get().handleServerMessage(msg);
      } catch (e) {
        console.error('Parse error', e);
      }
    };

    set({ ws });
  },

  disconnect: () => {
    if (wsInstance) {
      const trip = get().trip;
      if (trip) {
        wsInstance.send(JSON.stringify({ type: 'LEAVE_TRIP', tripId: trip.id }));
      }
      wsInstance.close();
      wsInstance = null;
    }
    set({ ws: null, connected: false });
  },

  sendMessage: (msg: ClientMessage) => {
    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  },

  handleServerMessage: (msg: ServerMessage) => {
    const state = get();
    switch (msg.type) {
      case 'TRIP_STATE': {
        const myUsername = state.currentMember?.username;
        const me = msg.trip.members.find((m) => m.username === myUsername) || msg.trip.members[msg.trip.members.length - 1];
        set({ trip: msg.trip, currentMember: me || null });
        break;
      }
      case 'SCHEDULE_ADDED': {
        if (state.trip) {
          set({
            trip: { ...state.trip, schedules: [...state.trip.schedules, msg.schedule] },
          });
          state.showToast('日程已添加', 'success');
        }
        break;
      }
      case 'SCHEDULE_UPDATED': {
        if (state.trip) {
          set({
            trip: {
              ...state.trip,
              schedules: state.trip.schedules.map((s) =>
                s.id === msg.schedule.id ? msg.schedule : s
              ),
            },
          });
        }
        break;
      }
      case 'SCHEDULE_DELETED': {
        if (state.trip) {
          set({
            trip: {
              ...state.trip,
              schedules: state.trip.schedules.filter((s) => s.id !== msg.scheduleId),
            },
          });
          state.showToast('日程已删除', 'success');
        }
        break;
      }
      case 'SCHEDULES_REORDERED': {
        if (state.trip) {
          const daySchedules = state.trip.schedules.filter((s) => s.dayKey === msg.dayKey);
          const others = state.trip.schedules.filter((s) => s.dayKey !== msg.dayKey);
          const ordered: Schedule[] = [];
          for (const id of msg.order) {
            const s = daySchedules.find((sch) => sch.id === id);
            if (s) ordered.push(s);
          }
          const remaining = daySchedules.filter((s) => !msg.order.includes(s.id));
          set({
            trip: { ...state.trip, schedules: [...others, ...ordered, ...remaining] },
          });
        }
        break;
      }
      case 'EXPENSE_ADDED': {
        if (state.trip) {
          set({
            trip: { ...state.trip, expenses: [...state.trip.expenses, msg.expense] },
          });
          state.showToast('费用已记录', 'success');
        }
        break;
      }
      case 'MEMBER_JOINED': {
        if (state.trip) {
          const exists = state.trip.members.some((m) => m.id === msg.member.id);
          if (!exists) {
            set({
              trip: { ...state.trip, members: [...state.trip.members, msg.member] },
            });
            state.showToast(`${msg.member.username} 加入了行程`, 'info');
          } else {
            set({
              trip: {
                ...state.trip,
                members: state.trip.members.map((m) =>
                  m.id === msg.member.id ? msg.member : m
                ),
              },
            });
          }
        }
        break;
      }
      case 'MEMBER_STATUS_CHANGED': {
        if (state.trip) {
          set({
            trip: {
              ...state.trip,
              members: state.trip.members.map((m) =>
                m.id === msg.memberId ? { ...m, online: msg.online } : m
              ),
            },
          });
        }
        break;
      }
    }
  },

  showToast: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => {
      get().removeToast(id);
    }, 2000);
  },

  removeToast: (id: string) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function calculateSettlements(trip: Trip | null) {
  if (!trip) return [];
  const map = new Map<string, { paid: number; owed: number }>();
  for (const m of trip.members) {
    map.set(m.id, { paid: 0, owed: 0 });
  }
  for (const exp of trip.expenses) {
    const payer = map.get(exp.paidBy);
    if (payer) payer.paid += exp.amount;
    if (exp.splitAmong.length > 0) {
      const share = exp.amount / exp.splitAmong.length;
      for (const mid of exp.splitAmong) {
        const m = map.get(mid);
        if (m) m.owed += share;
      }
    }
  }
  return trip.members.map((m) => {
    const s = map.get(m.id) || { paid: 0, owed: 0 };
    return {
      memberId: m.id,
      username: m.username,
      paid: Math.round(s.paid * 100) / 100,
      owed: Math.round(s.owed * 100) / 100,
      balance: Math.round((s.paid - s.owed) * 100) / 100,
    };
  });
}
