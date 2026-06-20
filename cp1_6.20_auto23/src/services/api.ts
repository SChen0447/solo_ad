import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    nickname: string;
    avatar: string;
  };
}

export interface CreateRoomResponse {
  roomId: string;
  roomName: string;
}

export const login = async (nickname: string): Promise<LoginResponse> => {
  const response = await api.post('/login', { nickname });
  return response.data;
};

export const createRoom = async (
  token: string,
  roomName: string
): Promise<CreateRoomResponse> => {
  const response = await api.post(
    '/rooms',
    { roomName },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const joinRoom = async (
  token: string,
  roomId: string
): Promise<{ roomId: string; roomName: string }> => {
  const response = await api.post(
    `/rooms/${roomId}/join`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const getRoomUsers = async (
  token: string,
  roomId: string
): Promise<any[]> => {
  const response = await api.get(`/rooms/${roomId}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export default api;
