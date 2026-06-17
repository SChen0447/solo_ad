export enum Tag {
  Inspiration = '灵感',
  Todo = '待办',
  Reading = '阅读',
  Idea = '想法',
}

export const TagColors: Record<Tag, string> = {
  [Tag.Inspiration]: '#f59e0b',
  [Tag.Todo]: '#ef4444',
  [Tag.Reading]: '#3b82f6',
  [Tag.Idea]: '#8b5cf6',
};

export enum ConnectionType {
  Support = 'support',
  Conflict = 'conflict',
  Supplement = 'supplement',
  Cause = 'cause',
}

export const ConnectionTypeConfig: Record<ConnectionType, { label: string; color: string }> = {
  [ConnectionType.Support]: { label: '支持', color: '#22c55e' },
  [ConnectionType.Conflict]: { label: '冲突', color: '#ef4444' },
  [ConnectionType.Supplement]: { label: '补充', color: '#3b82f6' },
  [ConnectionType.Cause]: { label: '导致', color: '#f59e0b' },
};

export interface InspirationCard {
  id: string;
  title: string;
  content: string;
  tags: Tag[];
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: ConnectionType;
  createdAt: number;
}

export function parseTags(text: string): { title: string; tags: Tag[] } {
  const tagRegex = /#([\u4e00-\u9fa5\w]+)/g;
  const tags: Tag[] = [];
  let match: RegExpExecArray | null;
  const tagValues = Object.values(Tag) as string[];

  while ((match = tagRegex.exec(text)) !== null) {
    const tagValue = match[1];
    if (tagValues.includes(tagValue)) {
      tags.push(tagValue as Tag);
    }
  }

  const title = text.replace(tagRegex, '').trim();
  return { title, tags };
}

export function createCard(
  id: string,
  text: string,
  x: number,
  y: number
): InspirationCard {
  const { title, tags } = parseTags(text);
  const now = Date.now();
  return {
    id,
    title: title || '未命名卡片',
    content: text,
    tags,
    x,
    y,
    createdAt: now,
    updatedAt: now,
  };
}

export function createConnection(
  id: string,
  sourceId: string,
  targetId: string,
  type: ConnectionType = ConnectionType.Supplement,
  label: string = ''
): Connection {
  return {
    id,
    sourceId,
    targetId,
    label,
    type,
    createdAt: Date.now(),
  };
}
