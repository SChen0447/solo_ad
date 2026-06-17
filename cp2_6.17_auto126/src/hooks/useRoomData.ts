import { useState, useEffect, useCallback, useRef } from 'react';

export interface Member {
  id: string;
  name: string;
  code: string;
}

export interface StandupItem {
  id: string;
  content: string;
}

export interface StandupCard {
  memberId: string;
  done: StandupItem[];
  plan: StandupItem[];
  blocked: StandupItem[];
  followed: boolean;
  updatedAt: number;
}

export interface RoomData {
  name: string;
  members: Member[];
  cards: Record<string, StandupCard>;
  createdAt: number;
  lastOpenedAt: number;
}

const STORAGE_KEY = 'standup_room_data_v1';

const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const generateUniqueCode = (existing: Set<string>): string => {
  let code: string;
  let attempts = 0;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
    if (attempts > 200) break;
  } while (existing.has(code));
  return code;
};

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export function useRoomData() {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RoomData;
        if (parsed && Array.isArray(parsed.members)) {
          parsed.lastOpenedAt = Date.now();
          setRoom(parsed);
        }
      }
    } catch (err) {
      console.warn('加载房间数据失败:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!room || isLoading) return;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(room));
      } catch (err) {
        console.warn('保存房间数据失败:', err);
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [room, isLoading]);

  const createRoom = useCallback((name: string, memberNames: string[]) => {
    const codes = new Set<string>();
    const members: Member[] = memberNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((rawName) => {
        const code = generateUniqueCode(codes);
        codes.add(code);
        return { id: uid(), name: rawName, code };
      });

    const cards: Record<string, StandupCard> = {};
    for (const m of members) {
      cards[m.id] = {
        memberId: m.id,
        done: [],
        plan: [],
        blocked: [],
        followed: false,
        updatedAt: Date.now(),
      };
    }

    const data: RoomData = {
      name: name.trim() || '未命名站会',
      members,
      cards,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
    };
    setRoom(data);
  }, []);

  const resetRoom = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('清除房间数据失败:', err);
    }
    setRoom(null);
  }, []);

  const updateCard = useCallback(
    (memberId: string, patch: Partial<StandupCard>) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const existing = prev.cards[memberId];
        if (!existing) return prev;
        const next = deepClone(prev);
        next.cards[memberId] = {
          ...next.cards[memberId],
          ...patch,
          updatedAt: Date.now(),
        };
        return next;
      });
    },
    []
  );

  const toggleFollow = useCallback((memberId: string) => {
    setRoom((prev) => {
      if (!prev) return prev;
      const card = prev.cards[memberId];
      if (!card) return prev;
      const nextCards: Record<string, StandupCard> = {};
      for (const [id, c] of Object.entries(prev.cards)) {
        if (id === memberId) {
          nextCards[id] = {
            ...c,
            followed: !c.followed,
            updatedAt: Date.now(),
          };
        } else {
          nextCards[id] = c;
        }
      }
      const next: RoomData = {
        ...prev,
        cards: nextCards,
      };
      const newFollowed = !card.followed;
      if (newFollowed) {
        const count = Object.values(nextCards).filter((c) => c.followed).length;
        console.log(`[关注] 添加成员 #${memberId.slice(0, 4)}，当前共 ${count} 条`);
      } else {
        console.log(`[关注] 取消成员 #${memberId.slice(0, 4)}`);
      }
      return next;
    });
  }, []);

  const getFollowedCards = useCallback((): Array<{ member: Member; card: StandupCard }> => {
    if (!room) return [];
    const seen = new Set<string>();
    const result: Array<{ member: Member; card: StandupCard }> = [];
    for (const m of room.members) {
      const card = room.cards[m.id];
      if (card && card.followed && !seen.has(m.id)) {
        seen.add(m.id);
        result.push({ member: m, card });
      }
    }
    return result;
  }, [room]);

  const generateSummaryText = useCallback((): string => {
    if (!room) return '';
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const lines: string[] = [];
    lines.push(`# ${room.name} 站会总结`);
    lines.push(`日期：${dateStr}`);
    lines.push(`成员：${room.members.map((m) => `${m.name}[#${m.code}]`).join('、')}`);
    lines.push('');
    lines.push('='.repeat(56));

    for (const m of room.members) {
      const card = room.cards[m.id];
      lines.push('');
      lines.push(`【${m.name}】 [#${m.code}]`);
      lines.push('-'.repeat(40));

      lines.push('✅ 今日完成：');
      if (card && card.done.length > 0) {
        card.done.forEach((it, i) => {
          lines.push(`  ${i + 1}. ${it.content || '(空)'}`);
        });
      } else {
        lines.push('  （无）');
      }

      lines.push('');
      lines.push('📌 明日计划：');
      if (card && card.plan.length > 0) {
        card.plan.forEach((it, i) => {
          lines.push(`  ${i + 1}. ${it.content || '(空)'}`);
        });
      } else {
        lines.push('  （无）');
      }

      lines.push('');
      lines.push('⚠️  阻塞问题：');
      if (card && card.blocked.length > 0) {
        card.blocked.forEach((it, i) => {
          lines.push(`  ${i + 1}. ${it.content || '(空)'}`);
        });
      } else {
        lines.push('  （无）');
      }

      lines.push('');
      lines.push('='.repeat(56));
    }

    return lines.join('\n');
  }, [room]);

  return {
    room,
    isLoading,
    createRoom,
    resetRoom,
    updateCard,
    toggleFollow,
    getFollowedCards,
    generateSummaryText,
  };
}
