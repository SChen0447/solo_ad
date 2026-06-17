import { useState, useEffect } from 'react';
import { Room, PlayerPosition, ClearedLine, ELEMENT_COLORS } from '../types';
import { gameEngine } from '../utils/gameEngine';
import './GameBoard.css';

interface GameBoardProps {
  rooms: Record<string, Room>;
  playerPos: PlayerPosition;
  clearedLines: ClearedLine[];
  selectedTotemId: string | null;
}

const GameBoard = ({ rooms, playerPos, clearedLines, selectedTotemId }: GameBoardProps) => {
  const [showActivationEffect, setShowActivationEffect] = useState<'success' | 'fail' | null>(null);
  const [showDoorAnimation, setShowDoorAnimation] = useState<string | null>(null);
  const [collectingResource, setCollectingResource] = useState<string | null>(null);
  const [showLineEffect, setShowLineEffect] = useState<ClearedLine | null>(null);

  const currentRoomId = `${playerPos.row}_${playerPos.col}`;
  const currentRoom = rooms[currentRoomId];

  useEffect(() => {
    const checkNewLines = () => {
      if (clearedLines.length > 0) {
        const latestLine = clearedLines[clearedLines.length - 1];
        setShowLineEffect(latestLine);
        setTimeout(() => setShowLineEffect(null), 800);
      }
    };
    checkNewLines();
  }, [clearedLines.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentRoom || currentRoom.cleared) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          gameEngine.movePlayer('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          gameEngine.movePlayer('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          gameEngine.movePlayer('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          gameEngine.movePlayer('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRoom]);

  const handleActivateTotem = async () => {
    if (!selectedTotemId || !currentRoom || currentRoom.cleared) return;

    const result = await gameEngine.activateTotem(selectedTotemId);

    if (result.success) {
      setShowActivationEffect('success');
      if (result.complete) {
        setShowDoorAnimation(currentRoomId);
        setTimeout(() => setShowDoorAnimation(null), 500);
      }
    } else {
      setShowActivationEffect('fail');
    }

    setTimeout(() => setShowActivationEffect(null), 600);
  };

  const handleCollectResource = (resourceId: string) => {
    if (collectingResource) return;
    
    setCollectingResource(resourceId);
    gameEngine.collectResource(resourceId);
    
    setTimeout(() => {
      setCollectingResource(null);
    }, 500);
  };

  const renderMinimap = () => (
    <div className="minimap">
      <div className="minimap-grid">
        {Array.from({ length: 3 }).map((_, row) =>
          Array.from({ length: 3 }).map((__, col) => {
            const roomId = `${row}_${col}`;
            const room = rooms[roomId];
            const isCurrent = playerPos.row === row && playerPos.col === col;
            const isCleared = room?.cleared;
            const hasLineEffect = showLineEffect?.rooms.includes(roomId);

            return (
              <div
                key={roomId}
                className={`minimap-room ${isCurrent ? 'current' : ''} ${isCleared ? 'cleared' : ''} ${hasLineEffect ? 'line-effect' : ''}`}
                onClick={() => {
                  if (room?.doorOpen || roomId === '0_0') {
                    // Direct click navigation if room is accessible
                  }
                }}
              >
                {isCurrent && <div className="minimap-player">●</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderRoomDetail = () => {
    if (!currentRoom) return null;

    return (
      <div className="room-detail glass-card">
        <div className="room-header">
          <h3>房间 ({currentRoom.row + 1}, {currentRoom.col + 1})</h3>
          {currentRoom.cleared && <span className="cleared-badge">已通关</span>}
        </div>

        <div className="room-view">
          <div className="room-clues">
            <span className="clue-label">能量线索：</span>
            <div className="clue-sequence">
              {currentRoom.totemSequence.map((element, index) => (
                <div
                  key={index}
                  className="clue-orb"
                  style={{ background: `linear-gradient(135deg, ${ELEMENT_COLORS[element][0]}, ${ELEMENT_COLORS[element][1]})` }}
                />
              ))}
            </div>
          </div>

          <div className="room-resources">
            {currentRoom.resources.map((resource) => (
              <div
                key={resource.id}
                className={`resource-point ${resource.collected ? 'collected' : ''} ${collectingResource === resource.id ? 'collecting' : ''}`}
                style={{ left: `${resource.x * 100}%`, top: `${resource.y * 100}%` }}
                onClick={() => !resource.collected && handleCollectResource(resource.id)}
              >
                <span className="resource-icon">
                  {resource.type === 'wood' && '🪵'}
                  {resource.type === 'ore' && '⛏️'}
                  {resource.type === 'crystal' && '💎'}
                </span>
                {collectingResource === resource.id && (
                  <div className="collect-ripple" />
                )}
              </div>
            ))}
          </div>

          <div className={`activation-pedestal ${showActivationEffect === 'success' ? 'success' : ''} ${showActivationEffect === 'fail' ? 'fail' : ''} ${currentRoom.cleared ? 'cleared' : ''}`}>
            <div className="pedestal-title">图腾激活台</div>
            <div className="activation-slots">
              {currentRoom.activationSlots.map((slot, index) => (
                <div
                  key={index}
                  className={`activation-slot ${slot ? 'filled' : ''} ${index < currentRoom.activationIndex ? 'active' : ''}`}
                >
                  {slot && (
                    <div
                      className="slot-totem"
                      style={{ background: `linear-gradient(135deg, ${ELEMENT_COLORS[slot][0]}, ${ELEMENT_COLORS[slot][1]})` }}
                    />
                  )}
                </div>
              ))}
            </div>
            {!currentRoom.cleared && (
              <button
                className="btn-primary activate-btn"
                onClick={handleActivateTotem}
                disabled={!selectedTotemId}
              >
                插入图腾
              </button>
            )}
          </div>

          <div className={`room-door ${currentRoom.doorOpen ? 'open' : ''} ${showDoorAnimation ? 'opening' : ''}`}>
            <div className="door-frame">
              <div className="door-panel left" />
              <div className="door-panel right" />
            </div>
            <span className="door-label">{currentRoom.doorOpen ? '门已开启' : '门已关闭'}</span>
          </div>
        </div>

        <div className="room-controls">
          <div className="direction-controls">
            <button className="dir-btn up" onClick={() => gameEngine.movePlayer('up')}>↑</button>
            <div className="dir-row">
              <button className="dir-btn left" onClick={() => gameEngine.movePlayer('left')}>←</button>
              <button className="dir-btn down" onClick={() => gameEngine.movePlayer('down')}>↓</button>
              <button className="dir-btn right" onClick={() => gameEngine.movePlayer('right')}>→</button>
            </div>
          </div>
          <div className="control-hint">
            使用 WASD 或方向键移动
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="game-board">
      {renderMinimap()}
      {renderRoomDetail()}
    </div>
  );
};

export default GameBoard;
