export type Language = 'javascript' | 'python' | 'html';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface CodeBlockData {
  id: string;
  language: Language;
  code: string;
  output?: string;
  error?: string;
  executionTime?: number;
}

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  codeBlocks: CodeBlockData[];
  createdAt: number;
  updatedAt: number;
}

export interface DocumentListItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

const API_BASE = '/api';

export const SandboxService = {
  async runCode(code: string, language: Language): Promise<ExecutionResult> {
    const response = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code, language })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `请求失败: ${response.status}`);
    }

    return response.json();
  },

  async getDocuments(): Promise<DocumentListItem[]> {
    const response = await fetch(`${API_BASE}/documents`);
    if (!response.ok) {
      throw new Error('获取文档列表失败');
    }
    return response.json();
  },

  async getDocument(id: string): Promise<DocumentData> {
    const response = await fetch(`${API_BASE}/documents/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('文档不存在');
      }
      throw new Error('获取文档失败');
    }
    return response.json();
  },

  async createDocument(title?: string): Promise<DocumentData> {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    if (!response.ok) {
      throw new Error('创建文档失败');
    }

    return response.json();
  },

  async saveDocument(
    id: string,
    data: Partial<Omit<DocumentData, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<DocumentData> {
    const response = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('保存文档失败');
    }

    return response.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('删除文档失败');
    }
  }
};
