export interface Chapter {
  id: string;
  title: string;
  content: string;
  type: 'plot' | 'character' | 'turning';
  characters: string[];
  events: string[];
  timestamp: number;
  order: number;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  strength: number;
  type: string;
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const saveChapter = (chapter: Partial<Chapter>): Promise<Chapter> => {
  if (chapter.id) {
    return request<Chapter>(`/chapters/${chapter.id}`, {
      method: 'PUT',
      body: JSON.stringify(chapter),
    });
  }
  return request<Chapter>('/chapters', {
    method: 'POST',
    body: JSON.stringify(chapter),
  });
};

export const loadChapters = (): Promise<Chapter[]> => {
  return request<Chapter[]>('/chapters');
};

export const deleteChapter = (id: string): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/chapters/${id}`, {
    method: 'DELETE',
  });
};

export const loadCharacters = (): Promise<Character[]> => {
  return request<Character[]>('/characters');
};

export const saveCharacter = (character: Partial<Character>): Promise<Character> => {
  if (character.id) {
    return request<Character>(`/characters/${character.id}`, {
      method: 'PUT',
      body: JSON.stringify(character),
    });
  }
  return request<Character>('/characters', {
    method: 'POST',
    body: JSON.stringify(character),
  });
};

export const loadRelations = (): Promise<Relation[]> => {
  return request<Relation[]>('/relations');
};

export const saveRelation = (relation: Partial<Relation>): Promise<Relation> => {
  if (relation.id) {
    return request<Relation>(`/relations/${relation.id}`, {
      method: 'PUT',
      body: JSON.stringify(relation),
    });
  }
  return request<Relation>('/relations', {
    method: 'POST',
    body: JSON.stringify(relation),
  });
};

export const deleteRelation = (id: string): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/relations/${id}`, {
    method: 'DELETE',
  });
};
