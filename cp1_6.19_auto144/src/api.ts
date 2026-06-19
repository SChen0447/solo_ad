import axios from 'axios';

export interface RetroItem {
  id: string;
  content: string;
  order: number;
}

export interface ActionItem extends RetroItem {
  assignee: string;
  dueDate: string;
  completed: boolean;
}

export interface RetroItems {
  good: RetroItem[];
  improve: RetroItem[];
  action: ActionItem[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  members: string[];
  items: RetroItems;
}

export type ItemCategory = 'good' | 'improve' | 'action';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getMeetings = (): Promise<Meeting[]> => {
  return api.get('/meetings').then((res) => res.data);
};

export const getMeeting = (id: string): Promise<Meeting> => {
  return api.get(`/meetings/${id}`).then((res) => res.data);
};

export const createMeeting = (data: {
  title: string;
  date: string;
  members: string[];
}): Promise<Meeting> => {
  return api.post('/meetings', data).then((res) => res.data);
};

export const updateMeeting = (
  id: string,
  data: Partial<Omit<Meeting, 'id'>>
): Promise<Meeting> => {
  return api.put(`/meetings/${id}`, data).then((res) => res.data);
};

export const deleteMeeting = (id: string): Promise<{ success: boolean }> => {
  return api.delete(`/meetings/${id}`).then((res) => res.data);
};

export const createItem = (
  meetingId: string,
  category: ItemCategory,
  data:
    | { content: string }
    | { content: string; assignee: string; dueDate: string }
): Promise<RetroItem | ActionItem> => {
  return api
    .post(`/meetings/${meetingId}/items/${category}`, data)
    .then((res) => res.data);
};

export const updateItem = (
  meetingId: string,
  category: ItemCategory,
  itemId: string,
  data: Partial<RetroItem | ActionItem>
): Promise<RetroItem | ActionItem> => {
  return api
    .put(`/meetings/${meetingId}/items/${category}/${itemId}`, data)
    .then((res) => res.data);
};

export const deleteItem = (
  meetingId: string,
  category: ItemCategory,
  itemId: string
): Promise<{ success: boolean }> => {
  return api
    .delete(`/meetings/${meetingId}/items/${category}/${itemId}`)
    .then((res) => res.data);
};

export const reorderItems = (
  meetingId: string,
  category: ItemCategory,
  orderedIds: string[]
): Promise<{ success: boolean }> => {
  return api
    .put(`/meetings/${meetingId}/items/${category}/reorder`, { orderedIds })
    .then((res) => res.data);
};

export const toggleActionComplete = (
  meetingId: string,
  actionId: string
): Promise<ActionItem> => {
  return api
    .put(`/meetings/${meetingId}/action/${actionId}/toggle`)
    .then((res) => res.data);
};
