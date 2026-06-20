import axios from 'axios';
import { ComposeRequest, ComposeResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export async function composeSprite(req: ComposeRequest): Promise<ComposeResponse> {
  const res = await api.post<ComposeResponse>('/compose-sprite', req);
  return res.data;
}

export async function fetchEquipments() {
  const res = await api.get('/equipments');
  return res.data.equipments;
}

export async function exportGif(req: ComposeRequest & { characterName: string }) {
  const res = await api.post('/export-gif', req);
  return res.data;
}

export async function exportSpriteSheet(req: ComposeRequest & { characterName: string }) {
  const res = await api.post('/export-spritesheet', req);
  return res.data;
}
