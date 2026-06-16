import axios from 'axios';
import { PersonalityParams, FlowNode, FlowEdge } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

export interface CreateNPCResponse {
  id: string;
  name: string;
  personality: PersonalityParams;
  avatarExpression: string;
}

export interface GenerateResponse {
  nodes: FlowNode[];
  edges: FlowEdge[];
  rootId: string;
  avatarExpression: string;
}

export interface UpdateNodeResponse {
  nodeId: string;
  text: string;
  personalityFit: number;
}

export interface AddChildResponse {
  node: FlowNode;
  edge: FlowEdge;
  personalityFit: number;
}

export interface SuggestChildResponse {
  id: string;
  text: string;
  personalityFit: number;
  nodeType: string;
}

export interface DeleteNodeResponse {
  deletedIds: string[];
}

export interface NPCListItem {
  id: string;
  name: string;
  personality: PersonalityParams;
  avatarExpression: string;
}

export interface ExportResponse {
  id: string;
  name: string;
  personality: PersonalityParams;
  avatarExpression: string;
  dialogueTree: any;
}

export async function createNPC(name: string, personality: PersonalityParams): Promise<CreateNPCResponse> {
  const res = await api.post('/npc/create', { name, personality });
  return res.data;
}

export async function generateDialogue(npcId: string, personality: PersonalityParams): Promise<GenerateResponse> {
  const res = await api.post('/npc/generate', { npcId, personality });
  return res.data;
}

export async function updateNode(npcId: string, nodeId: string, text: string): Promise<UpdateNodeResponse> {
  const res = await api.post('/npc/update_node', { npcId, nodeId, text });
  return res.data;
}

export async function addChild(
  npcId: string,
  parentId: string,
  text: string,
  personality: PersonalityParams
): Promise<AddChildResponse> {
  const res = await api.post('/npc/add_child', { npcId, parentId, text, personality });
  return res.data;
}

export async function suggestChild(
  npcId: string,
  personality: PersonalityParams,
  parentText: string
): Promise<SuggestChildResponse> {
  const res = await api.post('/npc/suggest_child', { npcId, personality, parentText });
  return res.data;
}

export async function deleteNode(npcId: string, nodeId: string): Promise<DeleteNodeResponse> {
  const res = await api.post('/npc/delete_node', { npcId, nodeId });
  return res.data;
}

export async function exportDialogueTree(npcId: string): Promise<ExportResponse> {
  const res = await api.get(`/npc/${npcId}/export`);
  return res.data;
}

export async function listNPCs(): Promise<NPCListItem[]> {
  const res = await api.get('/npc/list');
  return res.data;
}
