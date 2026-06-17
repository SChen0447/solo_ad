import { useCallback, useRef, useEffect, useState } from 'react';
import { useMindStore } from '@/store/useMindStore';
import { ConnectionType, ConnectionTypeConfig } from '@/model/CardModel';
import type { Connection } from '@/model/CardModel';
import CardItem from './CardItem';
import ConnectionLine from './ConnectionLine';

export default function CanvasView() {
  const cards = useMindStore(s => s.cards);
  const connections = useMindStore(s => s.connections);
  const connectingFrom = useMindStore(s => s.connectingFrom);
  const connectingTo = useMindStore(s => s.connectingTo);
  const editingConnectionId = useMindStore(s => s.editingConnectionId);
  const updateCardPosition = useMindStore(s => s.updateCardPosition);
  const setConnectingFrom = useMindStore(s => s.setConnectingFrom);
  const setConnectingTo = useMindStore(s => s.setConnectingTo);
  const addConnection = useMindStore(s => s.addConnection);
  const updateConnection = useMindStore(s => s.updateConnection);
  const setEditingConnectionId = useMindStore(s => s.setEditingConnectionId);
  const deleteConnection = useMindStore(s => s.deleteConnection);
  const setSelectedCardId = useMindStore(s => s.setSelectedCardId);
  const searchQuery = useMindStore(s => s.searchQuery);
  const getFilteredCards = useMindStore(s => s.getFilteredCards);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    cardId: string;
    startX: number;
    startY: number;
    cardStartX: number;
    cardStartY: number;
  } | null>(null);
  const rafRef = useRef<number>(0);

  const [connectionLabel, setConnectionLabel] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionType>(ConnectionType.Supplement);

  const filteredCards = getFilteredCards();
  const filteredCardIds = new Set(filteredCards.map(c => c.id));
  const filteredConnections = connections.filter(
    c => filteredCardIds.has(c.sourceId) && filteredCardIds.has(c.targetId)
  );

  const editingConnection = connections.find(c => c.id === editingConnectionId);

  const handleDragStart = useCallback(
    (cardId: string, clientX: number, clientY: number) => {
      const card = cards.find(c => c.id === cardId);
      if (!card) return;
      dragRef.current = {
        cardId,
        startX: clientX,
        startY: clientY,
        cardStartX: card.x,
        cardStartY: card.y,
      };
    },
    [cards]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (connectingFrom) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setConnectingTo({ x: clientX - rect.left, y: clientY - rect.top });
        }
        return;
      }

      if (!dragRef.current) return;
      e.preventDefault();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!dragRef.current) return;
        const dx = clientX - dragRef.current.startX;
        const dy = clientY - dragRef.current.startY;
        updateCardPosition(
          dragRef.current.cardId,
          dragRef.current.cardStartX + dx,
          dragRef.current.cardStartY + dy
        );
      });
    },
    [connectingFrom, updateCardPosition, setConnectingTo]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (connectingFrom) {
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const dropX = clientX - rect.left;
          const dropY = clientY - rect.top;

          const target = cards.find(
            c =>
              c.id !== connectingFrom &&
              dropX >= c.x &&
              dropX <= c.x + 220 &&
              dropY >= c.y &&
              dropY <= c.y + 100
          );

          if (target) {
            addConnection(connectingFrom, target.id);
          }
        }

        setConnectingFrom(null);
        setConnectingTo(null);
        return;
      }

      dragRef.current = null;
    },
    [connectingFrom, cards, addConnection, setConnectingFrom, setConnectingTo]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleCanvasClick = () => {
    setSelectedCardId(null);
    setEditingConnectionId(null);
  };

  const handleSaveConnection = () => {
    if (editingConnectionId) {
      updateConnection(editingConnectionId, { label: connectionLabel, type: connectionType });
      setEditingConnectionId(null);
      setConnectionLabel('');
    }
  };

  const getConnectingFromCard = () => {
    if (!connectingFrom) return null;
    return cards.find(c => c.id === connectingFrom) || null;
  };

  const fromCard = getConnectingFromCard();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto"
      onClick={handleCanvasClick}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="white" opacity="0.6" />
          </marker>
        </defs>

        {filteredConnections.map(conn => (
          <g key={conn.id} pointerEvents="auto">
            <ConnectionLine connection={conn} cards={cards} />
          </g>
        ))}

        {connectingFrom && fromCard && connectingTo && (
          <path
            d={`M ${fromCard.x + 110} ${fromCard.y + 50} C ${fromCard.x + 200} ${fromCard.y + 50}, ${connectingTo.x - 90} ${connectingTo.y}, ${connectingTo.x} ${connectingTo.y}`}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="6 4"
            fill="none"
            opacity="0.4"
            pointerEvents="none"
          />
        )}
      </svg>

      <div className="relative" style={{ zIndex: 2 }}>
        {filteredCards.map(card => (
          <div
            key={card.id}
            onMouseDown={e => {
              if ((e.target as HTMLElement).closest('[data-connection-handle]')) return;
              handleDragStart(card.id, e.clientX, e.clientY);
            }}
            onTouchStart={e => {
              if ((e.target as HTMLElement).closest('[data-connection-handle]')) return;
              handleDragStart(card.id, e.touches[0].clientX, e.touches[0].clientY);
            }}
          >
            <CardItem
              card={card}
              isHighlighted={
                !!searchQuery &&
                (card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  card.content.toLowerCase().includes(searchQuery.toLowerCase()))
              }
            />
          </div>
        ))}
      </div>

      {editingConnection && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={e => e.stopPropagation()}
        >
          <div
            className="backdrop-blur-[12px] bg-white/[0.1] border border-white/[0.15] rounded-[16px] p-6 w-[320px] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-white/90 text-base mb-4">编辑关联</h3>

            <div className="mb-3">
              <label className="text-white/50 text-xs mb-1 block font-body">关联说明</label>
              <input
                type="text"
                value={connectionLabel}
                onChange={e => setConnectionLabel(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-lg px-3 py-2 text-white/90 text-sm font-body outline-none focus:border-white/30 transition-colors"
                placeholder="输入关联说明..."
              />
            </div>

            <div className="mb-4">
              <label className="text-white/50 text-xs mb-1 block font-body">关联类型</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(ConnectionTypeConfig) as [ConnectionType, { label: string; color: string }][]).map(
                  ([type, config]) => (
                    <button
                      key={type}
                      onClick={() => setConnectionType(type)}
                      className="px-3 py-1 rounded-full text-xs font-body transition-all duration-200"
                      style={{
                        background:
                          connectionType === type
                            ? config.color + '33'
                            : 'rgba(255,255,255,0.06)',
                        color:
                          connectionType === type ? config.color : 'rgba(255,255,255,0.5)',
                        border:
                          connectionType === type
                            ? `1px solid ${config.color}55`
                            : '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {config.label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  deleteConnection(editingConnectionId!);
                  setEditingConnectionId(null);
                }}
                className="px-4 py-1.5 rounded-full text-xs font-body bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
              >
                删除
              </button>
              <button
                onClick={() => {
                  setEditingConnectionId(null);
                  setConnectionLabel('');
                }}
                className="px-4 py-1.5 rounded-full text-xs font-body bg-white/[0.08] text-white/60 border border-white/[0.15] hover:bg-white/[0.12] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveConnection}
                className="px-4 py-1.5 rounded-full text-xs font-body bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:opacity-90 transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
