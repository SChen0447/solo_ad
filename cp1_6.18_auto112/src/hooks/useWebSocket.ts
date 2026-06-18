import { useEffect, useRef, useCallback } from 'react';
import { useStoryStore } from '../stores/useStoryStore';
import type { Paragraph, Branch, Character, User } from '../utils/storyParser';

interface WsMessage {
  type: string;
  data: unknown;
}

interface InitData {
  user: User;
  story: {
    id: string;
    title: string;
    branches: Branch[];
    paragraphs: Record<string, Paragraph[]>;
    characters: Character[];
    cooldownSeconds: number;
    maxWords: number;
  };
  users: User[];
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const {
    setCurrentUser,
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    initStory,
    addParagraph,
    addBranch,
    addCharacter,
    updateCharacter,
    removeCharacter,
    setEditingInfo
  } = useStoryStore();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'init': {
            const data = msg.data as InitData;
            setCurrentUser(data.user);
            initStory(data.story);
            setOnlineUsers(data.users);
            break;
          }
          case 'user-joined': {
            const user = msg.data as User;
            addOnlineUser(user);
            break;
          }
          case 'user-left': {
            const { userId } = msg.data as { userId: string };
            removeOnlineUser(userId);
            break;
          }
          case 'paragraph-added': {
            const { paragraph } = msg.data as { paragraph: Paragraph; branchId: string };
            addParagraph(paragraph);
            break;
          }
          case 'branch-created': {
            const branch = msg.data as Branch;
            addBranch(branch);
            break;
          }
          case 'character-added': {
            const character = msg.data as Character;
            addCharacter(character);
            break;
          }
          case 'character-updated': {
            const character = msg.data as Character;
            updateCharacter(character);
            break;
          }
          case 'character-deleted': {
            const { id } = msg.data as { id: string };
            removeCharacter(id);
            break;
          }
          case 'editing-update': {
            setEditingInfo(msg.data as {
              userId: string;
              userName: string;
              branchId: string;
              isEditing: boolean;
            });
            break;
          }
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    };

    ws.onclose = () => {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      reconnectTimer.current = window.setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, [
    setCurrentUser,
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    initStory,
    addParagraph,
    addBranch,
    addCharacter,
    updateCharacter,
    removeCharacter,
    setEditingInfo
  ]);

  const send = useCallback((message: WsMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { send };
}
