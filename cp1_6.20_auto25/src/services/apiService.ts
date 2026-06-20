import axios from 'axios';
import { Task } from '../utils/mockData';

const api = axios.create({ baseURL: '/api' });

export async function fetchTasks(): Promise<Task[]> {
  const res = await api.get('/tasks');
  return res.data;
}

export async function updateTask(task: Task): Promise<Task> {
  const res = await api.put(`/tasks/${task.id}`, task);
  return res.data;
}

export async function optimizeSchedule(tasks: Task[]): Promise<Task[]> {
  const res = await api.post('/optimize', { tasks });
  return res.data;
}
