const FIXED_SALT = 'time-capsule-v1-salt-2024';
const KEY_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const DATE_TOLERANCE_DAYS = 1;

function normalizeDateUTC(date: Date): string {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCandidateDates(targetDate: Date): string[] {
  const candidates: string[] = [];
  const base = new Date(targetDate);

  for (let offset = -DATE_TOLERANCE_DAYS; offset <= DATE_TOLERANCE_DAYS; offset++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + offset);
    candidates.push(normalizeDateUTC(d));
  }

  return candidates;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function hashDate(date: Date): string {
  const normalized = normalizeDateUTC(date);
  return simpleHash(normalized + FIXED_SALT).toString(16).padStart(16, '0');
}

async function deriveKeyFromDateStr(dateStr: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseMaterial = encoder.encode(dateStr + '|' + FIXED_SALT);

  const initialHash = await window.crypto.subtle.digest('SHA-256', baseMaterial);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    initialHash,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBuffer = encoder.encode(FIXED_SALT);

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateKeyFromDate(targetDate: Date): Promise<CryptoKey> {
  const normalized = normalizeDateUTC(targetDate);
  return deriveKeyFromDateStr(normalized);
}

export async function encryptContent(content: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptContent(
  encrypted: string,
  key: CryptoKey
): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export async function decryptContentWithTolerance(
  encrypted: string,
  targetDate: Date
): Promise<string | null> {
  const candidates = getCandidateDates(targetDate);

  for (const dateStr of candidates) {
    try {
      const key = await deriveKeyFromDateStr(dateStr);
      const result = await decryptContent(encrypted, key);
      return result;
    } catch {
      continue;
    }
  }

  return null;
}
