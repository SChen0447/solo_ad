import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { petAPI } from '../api';
import StarButton from '../components/StarButton';

interface PetDetailData {
  id: number;
  name: string;
  breed: string;
  age: string;
  gender: string;
  personality: string;
  requirements: string;
  photos: string[];
  status: string;
  is_favorited: boolean;
}

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<PetDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchPet = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await petAPI.getPet(Number(id));
      setPet(res.data);
    } catch (err) {
      console.error('Failed to fetch pet', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  const nextSlide = () => {
    if (!pet || pet.photos.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % pet.photos.length);
  };

  const prevSlide = () => {
    if (!pet || pet.photos.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + pet.photos.length) % pet.photos.length);
  };

  if (loading) {
    return <div className="page-content"><div className="loading-spinner" /></div>;
  }

  if (!pet) {
    return (
      <div className="page-content">
        <div className="empty-state"><p>找不到该宠物信息</p></div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', color: 'var(--text-light)', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          ← 返回
        </button>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px', minWidth: '300px' }}>
            {pet.photos.length > 0 ? (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#f5f5f5' }}>
                <div style={{ width: '100%', paddingTop: '66%', position: 'relative' }}>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentSlide}
                      src={pet.photos[currentSlide]}
                      alt={`${pet.name} - ${currentSlide + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </AnimatePresence>

                  {pet.photos.length > 1 && (
                    <>
                      <button
                        onClick={prevSlide}
                        style={{
                          position: 'absolute', left: '12px', top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(255,255,255,0.85)', border: 'none',
                          borderRadius: '50%', width: '40px', height: '40px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', cursor: 'pointer',
                          transition: 'background 0.2s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        ‹
                      </button>
                      <button
                        onClick={nextSlide}
                        style={{
                          position: 'absolute', right: '12px', top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(255,255,255,0.85)', border: 'none',
                          borderRadius: '50%', width: '40px', height: '40px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', cursor: 'pointer',
                          transition: 'background 0.2s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {pet.photos.length > 1 && (
                  <div style={{
                    position: 'absolute', bottom: '12px', left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex', gap: '6px',
                  }}>
                    {pet.photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        style={{
                          width: idx === currentSlide ? '20px' : '8px',
                          height: '8px',
                          borderRadius: '4px',
                          background: idx === currentSlide ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                          border: 'none', cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                width: '100%', paddingTop: '66%', position: 'relative',
                background: 'var(--placeholder)', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '60px' }}>🐾</span>
              </div>
            )}

            {pet.photos.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto' }}>
                {pet.photos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`thumbnail ${idx}`}
                    onClick={() => setCurrentSlide(idx)}
                    style={{
                      width: '64px', height: '64px', objectFit: 'cover',
                      borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                      border: idx === currentSlide ? '2px solid var(--primary)' : '2px solid transparent',
                      opacity: idx === currentSlide ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: '1 1 400px', minWidth: '280px' }}>
            <div style={{
              background: 'var(--bg-white)', borderRadius: '12px',
              padding: '28px', boxShadow: '0 2px 8px #e0e0e0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>{pet.name}</h1>
                  <p style={{ color: 'var(--text-light)', fontSize: '15px' }}>{pet.breed}</p>
                </div>
                <StarButton petId={pet.id} initialFavorited={pet.is_favorited} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
                  background: pet.gender === 'Male' ? '#e3f2fd' : '#fce4ec',
                  color: pet.gender === 'Male' ? '#1565c0' : '#c62828',
                }}>
                  {pet.gender === 'Male' ? '♂ 公' : '♀ 母'}
                </span>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
                  background: '#f3e5f5', color: '#7b1fa2',
                }}>
                  {pet.age}
                </span>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
                  background: pet.status === 'available' ? '#e8f5e9' : '#fff3e0',
                  color: pet.status === 'available' ? '#2e7d32' : '#e65100',
                }}>
                  {pet.status === 'available' ? '可领养' : '已领养'}
                </span>
              </div>

              {pet.personality && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>性格描述</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: 1.8 }}>{pet.personality}</p>
                </div>
              )}

              {pet.requirements && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>领养要求</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: 1.8 }}>{pet.requirements}</p>
                </div>
              )}

              {pet.status === 'available' && (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/adopt/${pet.id}`)}
                  style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600 }}
                >
                  申请领养 {pet.name}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
