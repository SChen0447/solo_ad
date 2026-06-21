export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  reply?: string;
  replyAt?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  coverImage: string;
  createdAt: string;
  tools: string[];
  description: string;
  images: string[];
  comments: Comment[];
}

export interface Message {
  id: string;
  sender: 'client' | 'designer';
  content: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  budget: string;
  description: string;
  expectedDate: string;
  createdAt: string;
  status: 'pending' | 'replied' | 'completed';
  messages: Message[];
}

export type ToolCategory = 'digital' | 'traditional' | 'mixed';

export const DIGITAL_TOOLS = ['Procreate', 'Photoshop', 'Illustrator', 'Blender', '手绘板'];
export const TRADITIONAL_TOOLS = ['水彩', '彩铅', '钢笔', '速写本', '金粉'];
