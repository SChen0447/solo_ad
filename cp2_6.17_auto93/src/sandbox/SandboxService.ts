export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface CodeBlockData {
  id: string;
  language: string;
  code: string;
  output: string;
  error?: string;
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
  updatedAt: number;
  createdAt: number;
}

const API_BASE = '/api';

export async function runCode(
  code: string,
  language: string
): Promise<SandboxResult> {
  const response = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || 'Failed to execute code'
    );
  }

  return response.json() as Promise<SandboxResult>;
}

export async function getDocuments(): Promise<DocumentListItem[]> {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return response.json() as Promise<DocumentListItem[]>;
}

export async function getDocument(id: string): Promise<DocumentData> {
  const response = await fetch(`${API_BASE}/documents/${id}`);
  if (!response.ok) {
    throw new Error('Document not found');
  }
  return response.json() as Promise<DocumentData>;
}

export async function createDocument(
  data: Partial<DocumentData>
): Promise<DocumentData> {
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create document');
  }

  return response.json() as Promise<DocumentData>;
}

export async function updateDocument(
  id: string,
  data: Partial<DocumentData>
): Promise<DocumentData> {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update document');
  }

  return response.json() as Promise<DocumentData>;
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
}
