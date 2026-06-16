import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Scene } from './modules/three/Scene';
import { GiftPanel } from './modules/gift/GiftPanel';
import { Leaderboard } from './modules/leaderboard/Leaderboard';
import { GiftItem, GiftEvent } from './types';
import { connect, disconnect, emit, on, off } from './utils/socket';

const App: React.FC = () => {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    connect();

    const giftHandler = (...args: unknown[]) => {
      const data = args[0] as GiftEvent;
      if (data && sceneRef.current) {
        sceneRef.current.addGiftAnimation(
          data.giftName,
          data.giftValue,
          data.giftIconUrl
        );
      }
    };

    on('gift_event', giftHandler);

    return () => {
      off('gift_event', giftHandler);
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (sceneContainerRef.current && !sceneRef.current) {
      sceneRef.current = new Scene(sceneContainerRef.current);
    }
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, []);

  const handleGiftSend = useCallback((gift: GiftItem, targetName: string) => {
    const event: GiftEvent = {
      giftId: gift.id,
      giftName: gift.name,
      giftIconUrl: gift.iconUrl,
      giftValue: gift.value,
      senderName: '观众' + Math.floor(Math.random() * 9999),
      targetName,
      timestamp: Date.now(),
    };
    emit('gift_send', event);
    if (sceneRef.current) {
      sceneRef.current.addGiftAnimation(gift.name, gift.value, gift.iconUrl);
    }
  }, []);

  return (
    <div className="app-container">
      <div className="scene-wrapper" ref={sceneContainerRef} />
      <div className="leaderboard-wrapper">
        <Leaderboard />
      </div>
      <div className={`gift-panel-wrapper ${panelOpen ? 'open' : ''}`}>
        <GiftPanel onGiftSend={handleGiftSend} />
      </div>
      <button className="mobile-toggle" onClick={() => setPanelOpen(!panelOpen)}>
        {panelOpen ? '✕' : '🎁'}
      </button>
    </div>
  );
};

export default App;
