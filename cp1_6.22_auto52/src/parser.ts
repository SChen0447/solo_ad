export type ActionType =
  | 'move'
  | 'take'
  | 'look'
  | 'use'
  | 'talk'
  | 'inventory'
  | 'help'
  | 'invalid';

export interface ParsedAction {
  type: ActionType;
  direction?: string;
  itemName?: string;
  targetName?: string;
  npcName?: string;
  raw: string;
}

const VERBS_GO: string[] = ['go', 'move', 'walk', '走', '前往', '去', '移动', '走向'];
const VERBS_TAKE: string[] = ['take', 'pick', 'get', 'grab', '捡', '捡起', '拿', '拿起', '拾取', '取'];
const VERBS_LOOK: string[] = ['look', 'examine', 'inspect', 'see', 'check', '看', '查看', '检查', '观察', '打量', '看看'];
const VERBS_USE: string[] = ['use', 'activate', 'apply', 'employ', '使用', '激活', '用', '运用'];
const VERBS_TALK: string[] = ['talk', 'speak', 'chat', '说', '对话', '交谈', '聊天', '和...说话', '跟...说话', '与...交谈'];
const VERBS_INVENTORY: string[] = ['inventory', 'bag', 'backpack', 'i', 'inv', '背包', '物品', '物品栏', '道具', '查看背包'];
const VERBS_HELP: string[] = ['help', '?', '帮助', '指令', '命令', '怎么玩', '玩法'];

const DIRECTION_KEYWORDS: Record<string, string> = {
  '北': '北', '上': '北', 'n': '北', 'north': '北', '北方': '北', '北边': '北',
  '南': '南', '下': '南', 's': '南', 'south': '南', '南方': '南', '南边': '南',
  '东': '东', '右': '东', 'e': '东', 'east': '东', '东方': '东', '东边': '东',
  '西': '西', '左': '西', 'w': '西', 'west': '西', '西方': '西', '西边': '西',
  '东北': '东北', 'ne': '东北', '东北方': '东北', '右上方': '东北',
  '西北': '西北', 'nw': '西北', '西北方': '西北', '左上方': '西北',
  '东南': '东南', 'se': '东南', '东南方': '东南', '右下方': '东南',
  '西南': '西南', 'sw': '西南', '西南方': '西南', '左下方': '西南'
};

const STOPWORDS: Set<string> = new Set([
  'the', 'a', 'an', 'to', 'at', 'on', 'in', 'with', 'for', 'of',
  '我', '你', '他', '她', '它', '这', '那', '这个', '那个', '一下', '一个',
  '把', '将', '给', '向', '往', '朝', '到', '着', '了', '过',
  '吗', '呢', '啊', '吧', '呀', '哦', '嗯'
]);

function tokenize(input: string): string[] {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[，。！？、；：""''（）,.!?;:"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const tokens: string[] = [];
  const rawTokens = cleaned.split(' ');
  for (const t of rawTokens) {
    if (t && !STOPWORDS.has(t)) {
      tokens.push(t);
    }
  }
  return tokens;
}

function extractDirection(tokens: string[]): { direction: string; remaining: string[] } | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (DIRECTION_KEYWORDS[token]) {
      const remaining = [...tokens];
      remaining.splice(i, 1);
      return { direction: DIRECTION_KEYWORDS[token], remaining };
    }
  }
  return null;
}

function matchesVerb(token: string, verbList: string[]): boolean {
  return verbList.some(v => v.toLowerCase() === token || token.startsWith(v.toLowerCase()));
}

function extractVerb(tokens: string[]): { verb: string; remaining: string[] } | null {
  if (tokens.length === 0) return null;
  const first = tokens[0];

  if (matchesVerb(first, VERBS_GO)) return { verb: 'go', remaining: tokens.slice(1) };
  if (matchesVerb(first, VERBS_TAKE)) return { verb: 'take', remaining: tokens.slice(1) };
  if (matchesVerb(first, VERBS_LOOK)) return { verb: 'look', remaining: tokens.slice(1) };
  if (matchesVerb(first, VERBS_USE)) return { verb: 'use', remaining: tokens.slice(1) };
  if (matchesVerb(first, VERBS_TALK)) return { verb: 'talk', remaining: tokens.slice(1) };
  if (matchesVerb(first, VERBS_INVENTORY)) return { verb: 'inventory', remaining: tokens.slice(1) };
  if (matchesVerb(first, VERBS_HELP)) return { verb: 'help', remaining: tokens.slice(1) };

  return null;
}

export function parseInput(input: string): ParsedAction {
  const raw = input.trim();
  if (!raw) {
    return { type: 'invalid', raw };
  }

  const lowerRaw = raw.toLowerCase().trim();

  if (/^(help|\?|帮助|指令|命令|怎么玩|玩法)$/i.test(lowerRaw)) {
    return { type: 'help', raw };
  }
  if (/^(inventory|bag|backpack|\bi\b|\binv\b|背包|物品|物品栏|道具|查看背包)$/i.test(lowerRaw)) {
    return { type: 'inventory', raw };
  }

  for (const [k, v] of Object.entries(DIRECTION_KEYWORDS)) {
    const pattern = new RegExp(`^(向|朝|往)?\\s*${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(走|去|前|移动|边走)?$`, 'i');
    if (pattern.test(lowerRaw)) {
      return { type: 'move', direction: v, raw };
    }
  }

  const tokens = tokenize(input);

  const dirOnly = extractDirection(tokens);
  if (tokens.length === 1 && dirOnly) {
    return { type: 'move', direction: dirOnly.direction, raw };
  }

  const verbResult = extractVerb(tokens);

  if (!verbResult) {
    const dirCheck = extractDirection(tokens);
    if (dirCheck) {
      return { type: 'move', direction: dirCheck.direction, raw };
    }
    return { type: 'invalid', raw };
  }

  const { verb, remaining } = verbResult;

  switch (verb) {
    case 'go': {
      const dir = extractDirection(remaining);
      if (dir) {
        return { type: 'move', direction: dir.direction, raw };
      }
      return { type: 'invalid', raw };
    }
    case 'take': {
      if (remaining.length === 0) {
        return { type: 'take', itemName: '', raw };
      }
      const itemName = remaining.join('');
      return { type: 'take', itemName, raw };
    }
    case 'look': {
      if (remaining.length === 0) {
        return { type: 'look', raw };
      }
      const targetName = remaining.join('');
      return { type: 'look', targetName, raw };
    }
    case 'use': {
      if (remaining.length === 0) {
        return { type: 'use', itemName: '', raw };
      }
      let itemName = '';
      let targetName = '';
      const joinWords = ['with', 'on', 'to', 'for', '和', '与', '对', '给', '用在'];
      let splitIndex = -1;
      for (let i = 0; i < remaining.length; i++) {
        if (joinWords.includes(remaining[i])) {
          splitIndex = i;
          break;
        }
      }
      if (splitIndex >= 0) {
        itemName = remaining.slice(0, splitIndex).join('');
        targetName = remaining.slice(splitIndex + 1).join('');
      } else {
        itemName = remaining[0] || '';
        targetName = remaining.slice(1).join('');
      }
      return { type: 'use', itemName, targetName, raw };
    }
    case 'talk': {
      if (remaining.length === 0) {
        return { type: 'talk', npcName: '', raw };
      }
      const npcName = remaining.join('');
      return { type: 'talk', npcName, raw };
    }
    case 'inventory': {
      return { type: 'inventory', raw };
    }
    case 'help': {
      return { type: 'help', raw };
    }
    default:
      return { type: 'invalid', raw };
  }
}

export function getHelpText(): string {
  return [
    '=== 游戏指令帮助 ===',
    '【移动】向北走 / go north / 前进 南 / 前往 东',
    '【捡拾】捡起 剑 / take sword / 拿 钥匙',
    '【查看】查看 背包 / examine 守卫 / look 房间',
    '【使用】使用 钥匙 / use potion / 用 钥匙 对 门',
    '【对话】和 守卫 说话 / talk elder / 交谈 商人',
    '【背包】背包 / inventory / i',
    '【帮助】帮助 / help / ?',
    '======================'
  ].join('\n');
}
