import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Pet, MatchResult } from '../../../shared/types';

export default function PetDetail() {
  const { selectedPet, showDetail, setShowDetail, setShowApplicationForm, getMatches } = useAppContext();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const pet: Pet | null = selectedPet;

  useEffect(() => {
    if (pet) {
      getMatches(pet.id).then(setMatches);
      setImgIndex(0);
      setExpandedMatch(null);
    }
  }, [pet, getMatches]);

  if (!pet || !showDetail) return null;

  const allImages = [pet.mainImage, ...pet.subImages].slice(0, 4);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999,
      }}
    >
      <div
        onClick={() => setShowDetail(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '480px',
          maxWidth: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          overflowY: 'auto',
          animation: 'slideInRight 0.3s ease-out',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        <button
          onClick={() => setShowDetail(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(0,0,0,0.05)',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#333',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
        >
          ✕
        </button>

        <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              transition: 'transform 0.4s ease',
              transform: `translateX(-${imgIndex * 100}%)`,
              width: `${allImages.length * 100}%`,
              height: '280px',
            }}
          >
            {allImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${pet.name}-${i + 1}`}
                style={{
                  width: `${100 / allImages.length}%`,
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  flexShrink: 0,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="280" viewBox="0 0 432 280"><rect fill="#F0F2F5" width="432" height="280"/><text fill="#999" font-size="16" x="50%" y="50%" text-anchor="middle" dy=".3em">${pet.name}</text></svg>`
                    );
                }}
              />
            ))}
          </div>

          {allImages.length > 1 && (
            <>
              <button
                onClick={() => setImgIndex((imgIndex - 1 + allImages.length) % allImages.length)}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.85)',
                  color: '#333',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}
              >
                ‹
              </button>
              <button
                onClick={() => setImgIndex((imgIndex + 1) % allImages.length)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.85)',
                  color: '#333',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}
              >
                ›
              </button>
              <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                {allImages.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setImgIndex(i)}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: i === imgIndex ? '#F58F29' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333', margin: '0 0 8px 0' }}>{pet.name}</h2>
        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>
          {pet.breed} · {pet.age}岁
        </p>
        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px 0' }}>
          <span style={{ fontWeight: 600 }}>健康状况：</span>{pet.healthStatus}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {pet.personalityTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '13px',
                padding: '4px 12px',
                borderRadius: '8px',
                background: tag === '活泼' ? '#FFF3E0' : tag === '亲人' ? '#E8F5E9' : tag === '胆小' ? '#F3E5F5' : '#E3F2FD',
                color: tag === '活泼' ? '#E65100' : tag === '亲人' ? '#2E7D32' : tag === '胆小' ? '#6A1B9A' : '#1565C0',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={() => {
            setShowDetail(false);
            setShowApplicationForm(true);
          }}
          style={{
            width: '100%',
            padding: '12px',
            background: '#F58F29',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '24px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#E07D1A')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#F58F29')}
        >
          申请领养
        </button>

        <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#333', margin: '0 0 12px 0' }}>
            匹配候选人
          </h3>
          {matches.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#999' }}>暂无匹配候选人</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matches.map((m) => (
                <div
                  key={m.application.id}
                  style={{
                    background: '#FAFAFA',
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onClick={() =>
                    setExpandedMatch(expandedMatch === m.application.id ? null : m.application.id)
                  }
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '2px solid #4CAF50',
                        background: '#E8F5E9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        color: '#2E7D32',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {m.application.applicantName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                        {m.application.applicantName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {m.application.housingType === 'house' ? '独栋' : '公寓'} · 每日陪伴{m.application.dailyCompanionHours}小时
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: m.matchScore >= 80 ? '#4CAF50' : m.matchScore >= 50 ? '#F58F29' : '#999',
                      }}
                    >
                      {m.matchScore}%
                    </div>
                  </div>
                  {expandedMatch === m.application.id && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #E0E0E0',
                        fontSize: '13px',
                        color: '#666',
                        lineHeight: 1.8,
                      }}
                    >
                      <div>联系方式：{m.application.contactInfo}</div>
                      <div>居住类型：{m.application.housingType === 'house' ? '独栋' : '公寓'}</div>
                      <div>其他宠物：{m.application.hasOtherPets ? '有' : '无'}</div>
                      <div>每日陪伴：{m.application.dailyCompanionHours}小时</div>
                      {m.application.environmentImages.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ marginBottom: '4px' }}>居住环境：</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {m.application.environmentImages.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt="环境"
                                style={{
                                  width: '80px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
