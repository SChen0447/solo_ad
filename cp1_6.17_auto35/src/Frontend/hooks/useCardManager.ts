import { useState, useCallback } from 'react';
import { IdeaCard, Connection } from '../types';

const SOFT_COLORS = [
  '#7c9885',
  '#9b5de5',
  '#f15bb5',
  '#fee440',
  '#00bbf9',
  '#00f5d4',
  '#ff9f1c',
  '#ef476f',
  '#06d6a0',
  '#118ab2',
  '#e07a5f',
  '#81b29a'
];

const getRandomColor = (): string => {
  return SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
};

const generateId = (): string => {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useCardManager = () => {
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const addCard = useCallback((text: string, centerX: number, centerY: number) => {
    if (!text.trim() || text.length > 140) return;

    const newCard: IdeaCard = {
      id: generateId(),
      text: text.trim(),
      color: getRandomColor(),
      starred: false,
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY + (Math.random() - 0.5) * 100,
      createdAt: Date.now()
    };

    setCards(prev => [newCard, ...prev]);
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    setConnections(prev => prev.filter(
      conn => conn.sourceId !== cardId && conn.targetId !== cardId
    ));
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
    }
  }, [selectedCardId]);

  const toggleStar = useCallback((cardId: string) => {
    setCards(prev => {
      const updated = prev.map(card =>
        card.id === cardId ? { ...card, starred: !card.starred } : card
      );
      return updated.sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return b.createdAt - a.createdAt;
      });
    });
  }, []);

  const updateCardPosition = useCallback((cardId: string, x: number, y: number) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, x, y } : card
    ));
  }, []);

  const updateAllPositions = useCallback((positions: Record<string, { x: number; y: number }>) => {
    setCards(prev => prev.map(card => {
      const pos = positions[card.id];
      return pos ? { ...card, x: pos.x, y: pos.y } : card;
    }));
  }, []);

  const addConnection = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const exists = connections.some(
      conn => (conn.sourceId === sourceId && conn.targetId === targetId) ||
              (conn.sourceId === targetId && conn.targetId === sourceId)
    );

    if (!exists) {
      const newConnection: Connection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId,
        targetId
      };
      setConnections(prev => [...prev, newConnection]);
    }
  }, [connections]);

  const removeConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  }, []);

  const updateCardGroups = useCallback((clusterMap: Record<string, number>) => {
    setCards(prev => prev.map((card, index) => ({
      ...card,
      groupId: clusterMap[index.toString()]
    })));
  }, []);

  const resetGroups = useCallback(() => {
    setCards(prev => prev.map(card => ({ ...card, groupId: undefined })));
    setConnections([]);
  }, []);

  const resetLayout = useCallback((centerX: number, centerY: number) => {
    setCards(prev => prev.map((card, index) => {
      const angle = (index / prev.length) * Math.PI * 2;
      const radius = 150 + (index % 3) * 50;
      return {
        ...card,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        groupId: undefined
      };
    }));
    setConnections([]);
  }, []);

  const selectCard = useCallback((cardId: string | null) => {
    setSelectedCardId(cardId);
  }, []);

  return {
    cards,
    connections,
    selectedCardId,
    addCard,
    removeCard,
    toggleStar,
    updateCardPosition,
    updateAllPositions,
    addConnection,
    removeConnection,
    updateCardGroups,
    resetGroups,
    resetLayout,
    selectCard
  };
};
