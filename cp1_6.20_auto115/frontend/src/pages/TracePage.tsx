import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { traceService } from '../services/api';
import type { ProductTrace } from '../types';
import TraceCard from '../components/TraceCard';

interface TracePageProps {
  isMobile: boolean;
}

const TracePage: React.FC<TracePageProps> = ({ isMobile }) => {
  const [traceCode, setTraceCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductTrace | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2000);
  };

  const handleSearch = async (code?: string) => {
    const searchCode = (code || traceCode).trim();
    
    if (!searchCode) {
      setError('请输入12位追溯码');
      showToast('error', '请输入12位追溯码');
      return;
    }

    if (!/^\d{12}$/.test(searchCode)) {
      setError('追溯码格式错误，请输入12位数字');
      showToast('error', '追溯码格式错误');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await traceService.getTrace(searchCode);
      if (response.success && response.data) {
        setResult(response.data);
        showToast('success', '查询成功');
      } else {
        setError(response.message || '查询失败，请稍后重试');
        showToast('error', response.message || '查询失败');
      }
    } catch (e: any) {
      setError('网络错误，请稍后重试');
      showToast('error', '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleScanDemo = () => {
    const demoCodes = ['202401010001', '202401010002', '202401010003'];
    const randomCode = demoCodes[Math.floor(Math.random() * demoCodes.length)];
    setTraceCode(randomCode);
    setShowScanner(false);
    showToast('success', '扫码成功');
    setTimeout(() => handleSearch(randomCode), 300);
  };

  const handleQRCodeShare = () => {
    if (navigator.clipboard && result) {
      navigator.clipboard.writeText(result.trace_code);
      showToast('success', '追溯码已复制');
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: isMobile ? 20 : 32,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: 32,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 16 : 24 }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 style={{
              fontSize: isMobile ? 22 : 28,
              fontWeight: 700,
              color: '#2d3436',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}>
              <svg width={isMobile ? 24 : 30} height={isMobile ? 24 : 30} viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                  stroke="#6c5ce7"
                  strokeWidth="2"
                  fill="rgba(108, 92, 231, 0.08)"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#00b894"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              农产品溯源查询
            </h1>
            <p style={{
              fontSize: isMobile ? 13 : 14,
              color: '#636e72',
              margin: 0,
            }}>
              输入或扫描产品追溯码，查看产品全流程溯源信息
            </p>
          </motion.div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 12 : 16,
          maxWidth: 600,
          margin: '0 auto',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1,
                  color: '#b2bec3',
                }}
              >
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="3"
                  y="14"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M14 14h3v3h-3zM20 14v7M14 20h3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={traceCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setTraceCode(val);
                  if (error) setError(null);
                }}
                onKeyPress={handleKeyPress}
                placeholder="请输入12位产品追溯码"
                maxLength={12}
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 16px 0 46px',
                  fontSize: 15,
                  border: error ? '2px solid #d63031' : '1.5px solid #e0e0e0',
                  borderRadius: 12,
                  backgroundColor: '#ffffff',
                  color: '#2d3436',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  letterSpacing: 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = error ? '#d63031' : '#6c5ce7';
                  e.currentTarget.style.boxShadow = error
                    ? '0 0 0 3px rgba(214, 48, 49, 0.1)'
                    : '0 0 0 3px rgba(108, 92, 231, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error ? '#d63031' : '#e0e0e0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              padding: '0 4px',
            }}>
              {error ? (
                <span style={{ fontSize: 12, color: '#d63031' }}>{error}</span>
              ) : (
                <span />
              )}
              <span style={{ fontSize: 12, color: '#b2bec3' }}>{traceCode.length}/12</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 12,
            height: 48,
            flexShrink: 0,
          }}>
            <button
              onClick={() => setShowScanner(true)}
              style={{
                height: 48,
                padding: '0 16px',
                borderRadius: 12,
                backgroundColor: '#f8f9fa',
                color: '#6c5ce7',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
                border: '1.5px solid rgba(108, 92, 231, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(108, 92, 231, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7V4h3M7 20H4v-3M20 7V4h-3M17 20h3v-3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <rect
                  x="7"
                  y="7"
                  width="10"
                  height="10"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              {isMobile ? '' : '扫码'}
            </button>

            <button
              onClick={() => handleSearch()}
              disabled={loading}
              style={{
                height: 48,
                padding: '0 24px',
                borderRadius: 12,
                backgroundImage: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)',
                minWidth: isMobile ? 100 : 120,
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
              }}
            >
              {loading ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="3"
                  />
                  <path
                    d="M22 12a10 10 0 00-10-10"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.5" />
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {loading ? '查询中' : '查询'}
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: isMobile ? 16 : 20,
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <span style={{ fontSize: 12, color: '#b2bec3' }}>示例追溯码：</span>
          {['202401010001', '202401010002', '202401010003'].map((code) => (
            <button
              key={code}
              onClick={() => {
                setTraceCode(code);
                if (error) setError(null);
              }}
              style={{
                fontSize: 12,
                color: '#6c5ce7',
                backgroundColor: 'rgba(108, 92, 231, 0.08)',
                padding: '4px 10px',
                borderRadius: 6,
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(108, 92, 231, 0.16)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(108, 92, 231, 0.08)';
              }}
            >
              {code}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
              gap: 24,
              alignItems: 'flex-start',
            }}>
              <div style={{
                position: isMobile ? 'relative' : 'sticky',
                top: isMobile ? 'auto' : 96,
              }}>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 12,
                    border: '1.5px solid #f1f2f6',
                    backgroundColor: '#ffffff',
                    display: 'inline-block',
                  }}>
                    <QRCodeCanvas
                      value={result.trace_code}
                      size={160}
                      includeMargin={false}
                      level="M"
                      fgColor="#2d3436"
                      bgColor="#ffffff"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: 12,
                      color: '#636e72',
                      marginBottom: 4,
                    }}>
                      追溯码
                    </div>
                    <div
                      onClick={handleQRCodeShare}
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: '#6c5ce7',
                        letterSpacing: 2,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 8px',
                        borderRadius: 6,
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      {result.trace_code}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <div style={{
                    paddingTop: 16,
                    borderTop: '1px solid #f1f2f6',
                    marginBottom: 16,
                  }}>
                    <div style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#2d3436',
                      marginBottom: 6,
                    }}>
                      {result.product_name}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '3px 10px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(108, 92, 231, 0.1)',
                      color: '#6c5ce7',
                      marginBottom: 12,
                    }}>
                      {result.product_type}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: '#636e72',
                      lineHeight: 1.5,
                    }}>
                      {result.producer_name}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowScanner(true)}
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 22,
                      backgroundImage: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'none';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 7V4h3M7 20H4v-3M20 7V4h-3M17 20h3v-3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <rect
                        x="7"
                        y="7"
                        width="10"
                        height="10"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    扫码追溯
                  </button>
                </motion.div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                  padding: isMobile ? '0 4px' : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 4,
                      height: 22,
                      borderRadius: 2,
                      background: 'linear-gradient(180deg, #6c5ce7 0%, #a29bfe 100%)',
                    }} />
                    <h2 style={{
                      fontSize: isMobile ? 18 : 20,
                      fontWeight: 700,
                      color: '#2d3436',
                      margin: 0,
                    }}>
                      全流程溯源记录
                    </h2>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#636e72',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#00b894',
                    }} />
                    已完成 {result.stages.filter(s => s.status === 'completed').length}
                    <span style={{ color: '#dfe6e9', margin: '0 4px' }}>|</span>
                    <span style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#b2bec3',
                    }} />
                    待确认 {result.stages.filter(s => s.status === 'pending').length}
                  </div>
                </div>

                <div>
                  {result.stages.map((stage, index) => (
                    <TraceCard
                      key={index}
                      stage={stage}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === result.stages.length - 1}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!result && !loading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: isMobile ? 40 : 80,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
              textAlign: 'center',
            }}
          >
            <motion.div
              animate={{
                y: [0, -8, 0],
                transition: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }}
              style={{ marginBottom: 24 }}
            >
              <svg
                width={isMobile ? 80 : 120}
                height={isMobile ? 80 : 120}
                viewBox="0 0 120 120"
                fill="none"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="rgba(108, 92, 231, 0.06)"
                />
                <path
                  d="M60 22C39 22 22 39 22 60s17 38 38 38 38-17 38-38S81 22 60 22z"
                  stroke="rgba(108, 92, 231, 0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <rect
                  x="44"
                  y="40"
                  width="14"
                  height="14"
                  rx="2"
                  stroke="#6c5ce7"
                  strokeWidth="2.5"
                />
                <rect
                  x="62"
                  y="40"
                  width="14"
                  height="14"
                  rx="2"
                  stroke="#6c5ce7"
                  strokeWidth="2.5"
                />
                <rect
                  x="44"
                  y="58"
                  width="14"
                  height="14"
                  rx="2"
                  stroke="#6c5ce7"
                  strokeWidth="2.5"
                />
                <path
                  d="M62 58h9v9h-9zM76 58v12M62 73h9"
                  stroke="#00b894"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M48 84l4 4 12-12"
                  stroke="#00b894"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            <h3 style={{
              fontSize: isMobile ? 16 : 18,
              fontWeight: 600,
              color: '#2d3436',
              marginBottom: 8,
            }}>
              请输入或扫描产品追溯码
            </h3>
            <p style={{
              fontSize: isMobile ? 13 : 14,
              color: '#636e72',
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 400,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              追溯码位于产品包装上的12位数字编码，
              通过查询可获取该产品从种植到入库的完整溯源信息
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowScanner(false)}
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
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: isMobile ? 24 : 32,
                maxWidth: 480,
                width: '100%',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 7V4h3M7 20H4v-3M20 7V4h-3M17 20h3v-3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <rect
                        x="7"
                        y="7"
                        width="10"
                        height="10"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2d3436' }}>
                    扫码追溯
                  </h3>
                </div>
                <button
                  onClick={() => setShowScanner(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#f8f9fa',
                    color: '#636e72',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
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
              </div>

              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: 16,
                padding: isMobile ? 32 : 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: isMobile ? 200 : 240,
                  height: isMobile ? 200 : 240,
                  border: '2px solid #6c5ce7',
                  borderRadius: 16,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 32,
                    height: 32,
                    borderTop: '4px solid #6c5ce7',
                    borderLeft: '4px solid #6c5ce7',
                    borderTopLeftRadius: 12,
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderTop: '4px solid #6c5ce7',
                    borderRight: '4px solid #6c5ce7',
                    borderTopRightRadius: 12,
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: 32,
                    height: 32,
                    borderBottom: '4px solid #6c5ce7',
                    borderLeft: '4px solid #6c5ce7',
                    borderBottomLeftRadius: 12,
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderBottom: '4px solid #6c5ce7',
                    borderRight: '4px solid #6c5ce7',
                    borderBottomRightRadius: 12,
                  }} />
                  <motion.div
                    animate={{
                      top: ['5%', '95%', '5%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{
                      position: 'absolute',
                      left: 8,
                      right: 8,
                      height: 2,
                      background: 'linear-gradient(90deg, transparent, #00b894, transparent)',
                      borderRadius: 1,
                      boxShadow: '0 0 10px rgba(0, 184, 148, 0.8)',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 13,
                      color: '#636e72',
                      fontWeight: 500,
                    }}>
                      将追溯码二维码
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: '#636e72',
                      fontWeight: 500,
                    }}>
                      放入框内扫描
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                marginBottom: 20,
              }}>
                <p style={{
                  fontSize: 13,
                  color: '#636e72',
                  margin: 0,
                  marginBottom: 12,
                }}>
                  演示模式 - 点击下方按钮模拟扫码结果
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
              }}>
                {[
                  { code: '202401010001', name: '有机大米' },
                  { code: '202401010002', name: '冰糖心苹果' },
                  { code: '202401010003', name: '普洱古树茶' },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={handleScanDemo}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(108, 92, 231, 0.06)',
                      border: '1.5px solid rgba(108, 92, 231, 0.15)',
                      color: '#6c5ce7',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(108, 92, 231, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(108, 92, 231, 0.06)';
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>{item.code}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed',
              top: 96,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2000,
              padding: '12px 20px',
              borderRadius: 12,
              backgroundColor: toast.type === 'success' ? '#00b894' : '#d63031',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: toast.type === 'success'
                ? '0 8px 24px rgba(0, 184, 148, 0.4)'
                : '0 8px 24px rgba(214, 48, 49, 0.4)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              {toast.type === 'success' ? (
                <path
                  d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                  fill="#ffffff"
                />
              ) : (
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  fill="#ffffff"
                />
              )}
            </svg>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TracePage;
