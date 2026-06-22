import React, { useState, useEffect, useCallback } from 'react';
import GiftForm from '../components/GiftForm';
import GiftGallery from '../components/GiftGallery';
import type { Gift, CreateGiftDto } from '../types';
import { api } from '../utils/api';
import './GiftsPage.css';

const GiftsPage: React.FC = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGiftId, setNewGiftId] = useState<string | undefined>();

  const fetchGifts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getGifts();
      setGifts(data);
    } catch (err) {
      console.error('Failed to fetch gifts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  const handleCreateGift = useCallback(
    async (dto: CreateGiftDto) => {
      const newGift = await api.createGift(dto);
      setGifts((prev) => [newGift, ...prev]);
      setNewGiftId(newGift.id);
      setTimeout(() => setNewGiftId(undefined), 500);
    },
    []
  );

  return (
    <div className="gifts-page">
      <div className="gifts-layout">
        <aside className="gifts-sidebar">
          <GiftForm onSubmit={handleCreateGift} />
        </aside>
        <main className="gifts-main">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <GiftGallery gifts={gifts} newGiftId={newGiftId} />
          )}
        </main>
      </div>
    </div>
  );
};

export default GiftsPage;
