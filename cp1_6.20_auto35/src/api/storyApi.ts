import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { StoryProject, StoryNode, NodeVersion, InspirationCard } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:5001',
});

export const getProjects = (): Promise<StoryProject[]> =>
  api.get<StoryProject[]>('/projects').then((res) => res.data);

export const createProject = (data: Pick<StoryProject, 'name' | 'description'>): Promise<StoryProject> =>
  api.post<StoryProject>('/projects', data).then((res) => res.data);

export const getProject = (id: string): Promise<StoryProject> =>
  api.get<StoryProject>(`/projects/${id}`).then((res) => res.data);

export const getNodes = (projectId: string): Promise<StoryNode[]> =>
  api.get<StoryNode[]>(`/projects/${projectId}/nodes`).then((res) => res.data);

export const createNode = (projectId: string, data: Omit<StoryNode, 'id' | 'createdAt' | 'updatedAt' | 'versions'>): Promise<StoryNode> =>
  api.post<StoryNode>(`/projects/${projectId}/nodes`, data).then((res) => res.data);

export const updateNode = (nodeId: string, data: Partial<Pick<StoryNode, 'content' | 'summary' | 'targetWordCount'>>): Promise<StoryNode> =>
  api.put<StoryNode>(`/nodes/${nodeId}`, data).then((res) => res.data);

export const getVersions = (nodeId: string): Promise<NodeVersion[]> =>
  api.get<NodeVersion[]>(`/nodes/${nodeId}/versions`).then((res) => res.data);

export const getInspirations = (type?: InspirationCard['type']): Promise<InspirationCard[]> =>
  api.get<InspirationCard[]>('/inspirations', { params: type ? { type } : undefined }).then((res) => res.data);

export const getRandomInspiration = (): Promise<InspirationCard> =>
  api.get<InspirationCard>('/inspirations/random').then((res) => res.data);

export const generateInspiration = (keywords: string[]): Promise<InspirationCard> =>
  api.post<InspirationCard>('/inspirations/generate', { keywords }).then((res) => res.data);

const socket: Socket = io('http://localhost:5001');

export const joinProject = (projectId: string): void => {
  socket.emit('joinProject', projectId);
};

export const leaveProject = (projectId: string): void => {
  socket.emit('leaveProject', projectId);
};

export const onNodeUpdated = (callback: (node: StoryNode) => void): void => {
  socket.on('nodeUpdated', callback);
};

export const onNodeAdded = (callback: (node: StoryNode) => void): void => {
  socket.on('nodeAdded', callback);
};
