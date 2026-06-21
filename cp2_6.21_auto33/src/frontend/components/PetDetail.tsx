import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Pet, MatchResult } from '../types';

interface PetDetailProps {
  pet: Pet | null;
  onClose: () => void;
  onApply: () => void;
}

export default function PetDetail({ pet, onClose, onApply }: PetDetailProps) {
  const { getMatches, confirmAdoption, applications } = useApp();
  const [currentImage, setCurrentImage] = useState(0);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pet) {
      setCurrentImage(0);
      setExpandedMatch(null);
      setMatches([]);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
    }
  }, [pet]);

  useEffect(() => {
    if (!pet) return;
    let mounted = true;
    getMatches(pet.id).then(data => {
      if (mounted) setMatches(data);
    });
    return () => { mounted = false; };
  }, [pet?.id, getMatches]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleConfirmAdoption = (applicationId: string) => {
    if (!pet) return;
    confirmAdoption(applicationId, pet.id);
  };

  if (!pet) return null;

  const allImages = pet.images.length > 0 ? pet.images : [pet.mainImage];
  const petApplications = applications.filter(a => a.petId === pet.id);

  return (
    <div
      className={`detail-overlay ${visible ? 'detail-overlay-visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`detail-panel ${visible ? 'detail-panel-visible' : ''}`}>
        <button className="close-btn" onClick={handleClose}>×</button>

        <div className="detail-image-section">
          <img src={allImages[currentImage]} alt={pet.name} />
          {allImages.length > 1 && (
            <div className="detail-image-nav">
              <button onClick={() => setCurrentImage(prev => (prev - 1 + allImages.length) % allImages.length)}>
                ‹
              </button>
              <button onClick={() => setCurrentImage(prev => (prev + 1) % allImages.length)}>
                ›
              </button>
            </div>
          )}
          {allImages.length > 1 && (
            <div className="detail-thumbs">
              {allImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className={`thumb ${idx === currentImage ? 'active' : ''}`}
                  onClick={() => setCurrentImage(idx)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="detail-content">
          <h2 className="detail-name">{pet.name}</h2>
          <div className="detail-meta">
            <span>{pet.breed}</span>
            <span>·</span>
            <span>{pet.age}岁</span>
          </div>

          <div className="detail-section">
            <h3 className="section-title">健康状况</h3>
            <p>{pet.health}</p>
          </div>

          <div className="detail-section">
            <h3 className="section-title">性格标签</h3>
            <div className="pet-tags">
              {pet.personality.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">宠物描述</h3>
            <p>{pet.description}</p>
          </div>

          <div className="detail-section">
            <h3 className="section-title">匹配候选人 ({matches.length})</h3>
            {matches.length === 0 ? (
              <p className="empty-text">暂无通过审核的候选人</p>
            ) : (
              <div className="matches-list">
                {matches.map((match, index) => (
                  <div
                    key={match.applicationId}
                    className={`match-item ${expandedMatch === match.applicationId ? 'expanded' : ''}`}
                    onClick={() => setExpandedMatch(
                      expandedMatch === match.applicationId ? null : match.applicationId
                    )}
                  >
                    <div className="match-header">
                      <div className="match-rank">{index + 1}</div>
                      <div className="match-avatar" style={{ backgroundColor: getAvatarColor(match.applicantName) }}>
                        {match.applicantName.charAt(0)}
                      </div>
                      <div className="match-info">
                        <div className="match-name">{match.applicantName}</div>
                        <div className="match-contact">{match.contact}</div>
                      </div>
                      <div className="match-score">
                        <span className="score-value">{match.matchScore}</span>
                        <span className="score-label">匹配度</span>
                      </div>
                    </div>
                    {expandedMatch === match.applicationId && (
                      <div className="match-details">
                        <div className="match-reasons">
                          {match.matchReasons.map((reason, idx) => (
                            <span key={idx} className="reason-tag">✓ {reason}</span>
                          ))}
                        </div>
                        <div className="match-questionnaire">
                          <p>居住类型：{match.housingType}</p>
                          <p>每日陪伴时间：{match.dailyCompanionHours}小时</p>
                          <p>是否有其他宠物：{match.hasOtherPets ? '是' : '否'}</p>
                        </div>
                        <button
                          className="confirm-adopt-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmAdoption(match.applicationId);
                          }}
                        >
                          确认领养
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {petApplications.filter(a => a.status === '待审核').length > 0 && (
            <div className="detail-section">
              <h3 className="section-title">待审核申请 ({petApplications.filter(a => a.status === '待审核').length})</h3>
              <p className="empty-text">请前往管理后台审核</p>
            </div>
          )}

          <button className="apply-btn detail-apply-btn" onClick={onApply}>
            申请领养 {pet.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function getAvatarColor(name: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
