import pako from 'pako';
import { v4 as uuidv4 } from 'uuid';

export interface Snippet {
  id: string;
  code: string;
  language: string;
  createdAt: number;
  hash: string;
}

const STORAGE_PREFIX = 'snippet_';
const INDEX_KEY = 'snippet_index';

function compress(data: string): string {
  const compressed = pako.deflate(new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...compressed));
}

function decompress(encoded: string): string {
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(pako.inflate(bytes));
}

export function generateHash(): string {
  return uuidv4().replace(/-/g, '').substring(0, 8);
}

export function saveSnippet(snippet: Snippet): void {
  const key = STORAGE_PREFIX + snippet.hash;
  const compressed = compress(JSON.stringify(snippet));
  localStorage.setItem(key, compressed);
  const index = getIndex();
  if (!index.includes(snippet.hash)) {
    index.push(snippet.hash);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }
}

export function getSnippet(hash: string): Snippet | null {
  const key = STORAGE_PREFIX + hash;
  const compressed = localStorage.getItem(key);
  if (!compressed) return null;
  try {
    const json = decompress(compressed);
    return JSON.parse(json) as Snippet;
  } catch {
    return null;
  }
}

export function getIndex(): string[] {
  const raw = localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function getAllSnippets(): Snippet[] {
  const index = getIndex();
  const snippets: Snippet[] = [];
  for (const hash of index) {
    const snippet = getSnippet(hash);
    if (snippet) snippets.push(snippet);
  }
  return snippets.reverse();
}

export function deleteSnippet(hash: string): void {
  localStorage.removeItem(STORAGE_PREFIX + hash);
  const index = getIndex().filter((h) => h !== hash);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function createSnippet(code: string, language: string): Snippet {
  const snippet: Snippet = {
    id: uuidv4(),
    code,
    language,
    createdAt: Date.now(),
    hash: generateHash(),
  };
  saveSnippet(snippet);
  return snippet;
}
