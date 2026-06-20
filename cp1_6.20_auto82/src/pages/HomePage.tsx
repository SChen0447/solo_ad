import React, { useState, useEffect, useCallback, useRef } from 'react';
import { petAPI } from '../api';
import PetCard from '../components/PetCard';
import type { Pet } from '../components/PetCard';

export default function HomePage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'available' | 'all'>('available');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchPets = async (pageNum: number, reset = false) => {
    try {
      setLoading(true);
      const res = await petAPI.getPets({
        page: pageNum,
        per_page: 12,
        status: filter === 'all' ? undefined : filter,
      });
      const newPets = res.data.pets;
      setPets((prev) => (reset ? newPets : [...prev, ...newPets]));
      setHasMore(pageNum < res.data.pages);
    } catch (err) {
      console.error('Failed to fetch pets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setPets([]);
    fetchPets(1, true);
  }, [filter]);

  useEffect(() => {
    if (page > 1) {
      fetchPets(page);
    }
  }, [page]);

  return (
    <div className="page-content">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 className="section-title" style={{ marginBottom: 0 }}>🐾 寻找你的伙伴</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${filter === 'available' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setFilter('available')}
            >
              可领养
            </button>
            <button
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setFilter('all')}
            >
              全部
            </button>
          </div>
        </div>

        {pets.length === 0 && !loading && (
          <div className="empty-state">
            <p>🐾 暂无宠物信息，请稍后再来看看</p>
          </div>
        )}

        <div className="pet-grid">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>

        <div ref={loadMoreRef} style={{ height: '40px', margin: '20px 0' }}>
          {loading && <div className="loading-spinner" />}
        </div>

        {!hasMore && pets.length > 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px 0' }}>
            — 已展示全部宠物 —
          </p>
        )}
      </div>
    </div>
  );
}
