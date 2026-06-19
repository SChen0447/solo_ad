import { WebSocket } from 'ws';
import type { ClientMessage } from '../../shared/types';
import { tripManager } from './tripManager';

export function handleWebSocketConnection(ws: WebSocket): void {
  let joinedTripId: string | null = null;

  ws.on('message', (raw: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(raw.toString());

      switch (message.type) {
        case 'JOIN_TRIP': {
          const { member, trip } = tripManager.joinTrip(message.tripId, message.username, ws);
          joinedTripId = message.tripId;
          ws.send(JSON.stringify({ type: 'TRIP_STATE', trip }));
          break;
        }
        case 'LEAVE_TRIP': {
          tripManager.leaveTrip(ws);
          joinedTripId = null;
          break;
        }
        case 'ADD_SCHEDULE': {
          tripManager.addSchedule(message.tripId, message.schedule);
          break;
        }
        case 'UPDATE_SCHEDULE': {
          tripManager.updateSchedule(message.tripId, message.schedule);
          break;
        }
        case 'DELETE_SCHEDULE': {
          tripManager.deleteSchedule(message.tripId, message.scheduleId);
          break;
        }
        case 'REORDER_SCHEDULES': {
          tripManager.reorderSchedules(message.tripId, message.dayKey, message.order);
          break;
        }
        case 'ADD_EXPENSE': {
          tripManager.addExpense(message.tripId, message.expense);
          break;
        }
        case 'INVITE_MEMBER': {
          tripManager.inviteMember(message.tripId, message.username);
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    tripManager.leaveTrip(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
}
