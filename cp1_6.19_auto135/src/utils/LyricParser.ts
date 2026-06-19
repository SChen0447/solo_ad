import { v4 as uuidv4 } from 'uuid';
import { LyricLine, ParsedLyric, AnimationType } from '../types';

const PARAGRAPH_COLORS = [
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#60a5fa',
  '#fb7185',
  '#22d3ee',
  '#a3e635'
];

const TIMESTAMP_REGEX = /\[?(\d{1,2}):(\d{2})[.:](\d{2,3})\]?\s*(.*)/;
const SIMPLE_TIMESTAMP_REGEX = /^(\d{1,2}):(\d{2})[.:](\d{2,3})\s+(.*)/;

export function parseTimestamp(timestamp: string): number {
  const match = timestamp.match(/(\d{1,2}):(\d{2})[.:](\d{2,3})/);
  if (!match) return 0;
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const millisecondsPart = match[3];
  const milliseconds = millisecondsPart.length === 3 
    ? parseInt(millisecondsPart, 10) 
    : parseInt(millisecondsPart, 10) * 10;
  
  return minutes * 60 + seconds + milliseconds / 1000;
}

export function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function formatSRTTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function formatASSTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

export function parseLyrics(rawText: string): ParsedLyric {
  const lines = rawText.split('\n').filter(line => line.trim().length > 0);
  const parsedLines: LyricLine[] = [];
  let paragraphIndex = 0;
  let lastEndTime = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '' || line === '---') {
      paragraphIndex++;
      continue;
    }

    let startTime = lastEndTime;
    let text = line;

    const bracketMatch = line.match(TIMESTAMP_REGEX);
    const simpleMatch = line.match(SIMPLE_TIMESTAMP_REGEX);
    
    if (bracketMatch) {
      startTime = parseInt(bracketMatch[1], 10) * 60 + parseInt(bracketMatch[2], 10) + 
        (bracketMatch[3].length === 3 ? parseInt(bracketMatch[3], 10) : parseInt(bracketMatch[3], 10) * 10) / 1000;
      text = bracketMatch[4] || '';
    } else if (simpleMatch) {
      startTime = parseInt(simpleMatch[1], 10) * 60 + parseInt(simpleMatch[2], 10) + 
        (simpleMatch[3].length === 3 ? parseInt(simpleMatch[3], 10) : parseInt(simpleMatch[3], 10) * 10) / 1000;
      text = simpleMatch[4] || '';
    }

    if (text.trim() === '') {
      paragraphIndex++;
      continue;
    }

    const duration = 3;
    const endTime = startTime + duration;
    lastEndTime = startTime + 0.1;

    parsedLines.push({
      id: uuidv4(),
      text: text.trim(),
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      duration: duration,
      animation: 'fade',
      color: PARAGRAPH_COLORS[paragraphIndex % PARAGRAPH_COLORS.length],
      paragraphIndex
    });
  }

  parsedLines.sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < parsedLines.length - 1; i++) {
    const current = parsedLines[i];
    const next = parsedLines[i + 1];
    const calculatedEnd = Math.max(current.startTime + 1, next.startTime - 0.1);
    current.endTime = Math.round(Math.min(calculatedEnd, current.startTime + 8) * 10) / 10;
    current.duration = Math.round((current.endTime - current.startTime) * 10) / 10;
  }

  if (parsedLines.length > 0) {
    const last = parsedLines[parsedLines.length - 1];
    if (last.duration < 1) {
      last.endTime = last.startTime + 3;
      last.duration = 3;
    }
  }

  const totalDuration = parsedLines.length > 0 
    ? parsedLines[parsedLines.length - 1].endTime + 2 
    : 60;

  return { lines: parsedLines, totalDuration };
}

export function createLyricLine(text: string, startTime: number, paragraphIndex: number = 0): LyricLine {
  return {
    id: uuidv4(),
    text: text.trim(),
    startTime: Math.round(startTime * 10) / 10,
    endTime: Math.round((startTime + 3) * 10) / 10,
    duration: 3,
    animation: 'fade' as AnimationType,
    color: PARAGRAPH_COLORS[paragraphIndex % PARAGRAPH_COLORS.length],
    paragraphIndex
  };
}

export function updateLyricLineTimes(lines: LyricLine[], updatedId: string, newStartTime: number): LyricLine[] {
  return lines.map(line => {
    if (line.id === updatedId) {
      const roundedStart = Math.round(newStartTime * 10) / 10;
      return {
        ...line,
        startTime: roundedStart,
        endTime: Math.round((roundedStart + line.duration) * 10) / 10
      };
    }
    return line;
  }).sort((a, b) => a.startTime - b.startTime);
}
