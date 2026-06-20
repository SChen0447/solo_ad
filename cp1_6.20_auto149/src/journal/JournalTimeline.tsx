import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import DiaryCard from './DiaryCard';
import { Diary } from '../types';

interface JournalTimelineProps {
  userPoints: number;
  setUserPoints: (points: number) => void;
  currentUserId: number;
}

const JournalTimeline = ({ userPoints, setUserPoints, currentUserId }: JournalTimelineProps) => {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);

  const fetchDiaries = useCallback(async (pageNum: number, isNew = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await axios.get('/api/plots/diaries', {
        params: {
          page: pageNum,
          per_page: 5,
        },
      });

      if (isNew) {
        setDiaries(response.data.diaries);
      } else {
        setDiaries((prev) => [...prev, ...response.data.diaries]);
      }
      setHasMore(response.data.has_more);
      pageRef.current = pageNum;
    } catch (error) {
      console.error('获取日记列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchDiaries(1, true);
  }, [fetchDiaries]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && page === pageRef.current) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchDiaries(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, loading, fetchDiaries, page]);

  const groupByDate = (diaryList: Diary[]) => {
    const groups: { [key: string]: Diary[] } = {};
    diaryList.forEach((diary) => {
      const date = new Date(diary.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(diary);
    });
    return groups;
  };

  const groupedDiaries = groupByDate(diaries);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#4a7c59', fontSize: '24px', marginBottom: '8px' }}>
          📖 种植日志
        </h2>
        <p style={{ color: '#b5a48b', fontSize: '14px' }}>
          记录每一份耕耘的喜悦，分享每一次收获的感动
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: '150px',
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#d9cdc1',
          }}
        />

        {Object.entries(groupedDiaries).map(([date, dateDiaries], groupIndex) => (
          <div key={date} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div
                style={{
                  width: '130px',
                  textAlign: 'right',
                  paddingRight: '20px',
                  paddingTop: '4px',
                }}
              >
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIndex * 0.1, duration: 0.3 }}
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#4a7c59',
                    backgroundColor: '#e8f0ea',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    display: 'inline-block',
                  }}
                >
                  {date}
                </motion.span>
              </div>

              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#7ebc59',
                  marginTop: '10px',
                  marginLeft: '-5px',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 2px #7ebc59',
                  flexShrink: 0,
                }}
              />

              <div style={{ marginLeft: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <AnimatePresence>
                    {dateDiaries.map((diary, index) => (
                      <motion.div
                        key={diary.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: groupIndex * 0.1 + index * 0.05,
                          duration: 0.3,
                        }}
                      >
                        <DiaryCard
                          diary={diary}
                          currentUserId={currentUserId}
                          userPoints={userPoints}
                          setUserPoints={setUserPoints}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={observerRef} style={{ textAlign: 'center', padding: '40px' }}>
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: '24px',
              height: '24px',
              border: '3px solid #d9cdc1',
              borderTopColor: '#4a7c59',
              borderRadius: '50%',
              margin: '0 auto',
            }}
          />
        )}
        {!hasMore && diaries.length > 0 && (
          <p style={{ color: '#999', fontSize: '14px' }}>已经到底啦~</p>
        )}
        {!hasMore && diaries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <span style={{ fontSize: '64px' }}>🌱</span>
            <p style={{ color: '#999', marginTop: '16px', fontSize: '14px' }}>
              还没有日记，快去认领一块地开始记录吧~
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalTimeline;
