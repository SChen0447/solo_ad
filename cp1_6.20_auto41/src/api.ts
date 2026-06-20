import axios from "axios";
import { io, Socket } from "socket.io-client";

export interface TeamMember {
  id: string;
  name: string;
}

export type Priority = "urgent" | "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  assignee: TeamMember;
  estimate: number;
  priority: Priority;
  column_id: string;
  order: number;
  created_at: string;
}

export interface SprintColumn {
  id: string;
  name: string;
  wip: number;
  icon: string;
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number | null;
}

export interface BoardData {
  columns: SprintColumn[];
  tasks: Task[];
  team_members: TeamMember[];
  burndown_data: BurndownPoint[];
  sprint_start_date: string;
  sprint_duration: number;
}

const api = axios.create({
  baseURL: "/api",
});

export const boardApi = {
  getBoard: (): Promise<BoardData> =>
    api.get("/board").then((res) => res.data),

  moveTask: (
    taskId: string,
    columnId: string,
    order: number
  ): Promise<{ success: boolean; task: Task }> =>
    api
      .put(`/tasks/${taskId}/move`, { column_id: columnId, order })
      .then((res) => res.data),

  createTask: (data: {
    title?: string;
    assignee?: TeamMember;
    estimate?: number;
    priority?: Priority;
  }): Promise<Task> => api.post("/tasks", data).then((res) => res.data),
};

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io({
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emitMoveTask(taskId: string, columnId: string, order: number): void {
    if (this.socket) {
      this.socket.emit("move_task", {
        task_id: taskId,
        column_id: columnId,
        order,
      });
    }
  }

  onTaskMoved(callback: (data: { task_id: string; column_id: string; order: number; tasks: Task[] }) => void): () => void {
    const socket = this.connect();
    const handler = (data: { task_id: string; column_id: string; order: number; tasks: Task[] }) => callback(data);
    socket.on("task_moved", handler);
    return () => socket.off("task_moved", handler);
  }

  onTaskAdded(callback: (data: { task: Task }) => void): () => void {
    const socket = this.connect();
    const handler = (data: { task: Task }) => callback(data);
    socket.on("task_added", handler);
    return () => socket.off("task_added", handler);
  }

  onBurndownUpdated(callback: (data: { burndown_data: BurndownPoint[] }) => void): () => void {
    const socket = this.connect();
    const handler = (data: { burndown_data: BurndownPoint[] }) => callback(data);
    socket.on("burndown_updated", handler);
    return () => socket.off("burndown_updated", handler);
  }
}

export const socketService = new SocketService();
