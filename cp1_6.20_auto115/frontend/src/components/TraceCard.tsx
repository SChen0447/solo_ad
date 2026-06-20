import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TraceStage } from '../types';

interface TraceCardProps {
  stage: TraceStage;
  index: number;
  isFirst?: boolean;
  isLast?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
}

const STAGE_ICONS: Record<string, JSX.Element> = {
  种植: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2v6M12 8c-4 0-7-2-7-6 0 4-3 6-7 6s-7-2-7-6c0 4 3 6 7 6v14h14V14c4 0 7-2 7-6-4 0-7 2-7 6z"
        transform="translate(14 0)"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  加工: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h16v4H4zM8 8v12M16 8v12M4 20h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  质检: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 12l2 2 4-4M4 6h16v12H4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  运输: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM6 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  入库: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const TraceCard: React.FC<TraceCardProps> = ({
  stage,
  index,
  isFirst = false,
  isLast = false,
  isMobile = false,
  isTablet = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isCompleted = stage.status === 'completed';
  const statusColor = isCompleted ? '#00b894' : '#b2bec3';
  const icon = STAGE_ICONS[stage.stage_name] || STAGE_ICONS['种植'];

  const cardGap = isMobile ? 16 : isTablet ? 8 : 16;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.4,
          ease: 'easeOut',
          delay: index * 0.08,
        }}
        style={{
          position: 'relative',
          marginBottom: isLast ? 0 : cardGap,
          paddingLeft: isMobile ? 44 : 56,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: isMobile ? 10 : 16,
            top: 0,
            bottom: -cardGap,
            width: 2,
            backgroundColor: isFirst ? 'transparent' : isCompleted ? '#dfe6e9' : '#f1f2f6',
          }}
        />
        {isLast && (
          <div
            style={{
              position: 'absolute',
              left: isMobile ? 10 : 16,
              top: 'auto',
              bottom: -cardGap,
              width: 2,
              height: 24,
              backgroundColor: 'transparent',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            left: isMobile ? 0 : 6,
            top: 4,
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: isCompleted ? '#00b894' : '#ffffff',
            border: isCompleted ? `3px solid #00b894` : `3px solid #b2bec3`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            boxShadow: isCompleted
              ? '0 2px 8px rgba(0, 184, 148, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isCompleted ? '#ffffff' : '#b2bec3',
            }}
          />
        </div>

        <motion.div
          whileHover={{
            scale: 1.005,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpanded(!expanded)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: isMobile ? 16 : 20,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: `1px solid ${isCompleted ? 'rgba(0, 184, 148, 0.12)' : '#f1f2f6'}`,
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 8 : 12,
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  color: statusColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isCompleted ? 'rgba(0, 184, 148, 0.08)' : '#f1f2f6',
                }}
              >
                {icon}
              </div>
              <div>
                <h3 style={{
                  fontSize: isMobile ? 16 : 17,
                  fontWeight: 600,
                  color: '#2d3436',
                  margin: 0,
                }}>
                  {stage.stage_name}
                </h3>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              alignSelf: isMobile ? 'flex-end' : 'auto',
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: isCompleted ? 'rgba(0, 184, 148, 0.1)' : '#f1f2f6',
                color: statusColor,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  {isCompleted ? (
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  ) : (
                    <circle cx="12" cy="12" r="6" />
                  )}
                </svg>
                {isCompleted ? '已完成' : '待确认'}
              </span>
              <span style={{
                fontSize: isMobile ? 12 : 13,
                color: '#636e72',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>
                {stage.date}
              </span>
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: expanded ? 'rgba(108, 92, 231, 0.1)' : '#f8f9fa',
                  color: expanded ? '#6c5ce7' : '#636e72',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 8 : 16,
            marginBottom: expanded ? 0 : 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" color="#636e72">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: 13, color: '#636e72', fontWeight: 400 }}>
                <span style={{ color: '#2d3436', fontWeight: 500 }}>地点：</span>
                {stage.location}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" color="#636e72">
                <path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: 13, color: '#636e72', fontWeight: 400 }}>
                <span style={{ color: '#2d3436', fontWeight: 500 }}>操作人：</span>
                {stage.operator}
              </span>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  paddingTop: 16,
                  borderTop: '1px solid #f1f2f6',
                }}>
                  <div style={{ marginBottom: stage.images.length > 0 ? 16 : 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" color="#6c5ce7">
                        <path
                          d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2d3436' }}>
                        备注说明
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: '#636e72',
                      margin: 0,
                      padding: '10px 14px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: 8,
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                    }}>
                      {stage.remarks}
                    </p>
                  </div>

                  {stage.images.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 10,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" color="#6c5ce7">
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <circle
                            cx="8.5"
                            cy="8.5"
                            r="1.5"
                            fill="currentColor"
                          />
                          <path
                            d="M21 15l-5-5L5 21"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#2d3436' }}>
                          现场照片
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}>
                        {stage.images.slice(0, 3).map((img, imgIndex) => (
                          <motion.div
                            key={imgIndex}
                            whileHover={{ scale: 1.05, zIndex: 10 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(img);
                            }}
                            style={{
                              width: 100,
                              height: 100,
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: '1px solid #e0e0e0',
                              cursor: 'pointer',
                              backgroundColor: '#f8f9fa',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={img}
                              alt={`${stage.stage_name}照片${imgIndex + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              cursor: 'pointer',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.25, type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
            >
              <img
                src={previewImage}
                alt="预览图"
                style={{
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <button
                onClick={() => setPreviewImage(null)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TraceCard;
