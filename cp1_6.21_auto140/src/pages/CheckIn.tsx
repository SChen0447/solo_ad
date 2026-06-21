import React, { useState, useEffect, useRef } from 'react';
import type { Customer } from '../App';

interface CheckInProps {
  customer: Customer | null;
  customerId: string;
  onPointsUpdate: (customer: Customer) => void;
}

function CheckIn({ customer, customerId, onPointsUpdate }: CheckInProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(customer?.points || 0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const animationRef = useRef<number | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const generateQRData = () => {
    const timestamp = Date.now();
    const rawData = `${customerId}|${timestamp}`;
    return btoa(rawData);
  };

  const [qrData, setQrData] = useState(generateQRData());

  useEffect(() => {
    const interval = setInterval(() => {
      setQrData(generateQRData());
    }, 30000);
    return () => clearInterval(interval);
  }, [customerId]);

  useEffect(() => {
    if (customer) {
      setDisplayPoints(customer.points);
    }
  }, [customer?.points]);

  const animatePoints = (fromPoints: number, toPoints: number) => {
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentPoints = Math.round(fromPoints + (toPoints - fromPoints) * easeOut);
      setDisplayPoints(currentPoints);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleCheckIn = async () => {
    if (isAnimating) return;

    setErrorMsg('');
    setIsAnimating(true);

    try {
      const qrCode = generateQRData();
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: qrCode }),
      });

      const data = await response.json();

      if (response.ok) {
        const oldPoints = customer?.points || 0;
        const newPoints = data.customer.points;
        animatePoints(oldPoints, newPoints);
        onPointsUpdate(data.customer);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        setErrorMsg(data.error || '签到失败');
      }
    } catch (error) {
      setErrorMsg('网络错误，请稍后重试');
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const QRCodeDisplay = ({ size = 200 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ background: '#fff', borderRadius: '8px' }}
    >
      <rect x="0" y="0" width="200" height="200" fill="#ffffff" />
      <rect x="20" y="20" width="50" height="50" fill="#8B4513" />
      <rect x="30" y="30" width="30" height="30" fill="#ffffff" />
      <rect x="35" y="35" width="20" height="20" fill="#8B4513" />
      <rect x="130" y="20" width="50" height="50" fill="#8B4513" />
      <rect x="140" y="30" width="30" height="30" fill="#ffffff" />
      <rect x="145" y="35" width="20" height="20" fill="#8B4513" />
      <rect x="20" y="130" width="50" height="50" fill="#8B4513" />
      <rect x="30" y="140" width="30" height="30" fill="#ffffff" />
      <rect x="35" y="145" width="20" height="20" fill="#8B4513" />
      {[...Array(12)].map((_, row) =>
        [...Array(12)].map((_, col) => {
          const x = 80 + col * 3.5;
          const y = 80 + row * 3.5;
          const seed = (row * 13 + col * 7 + parseInt(customerId.slice(-3), 10)) % 5;
          return seed < 2 ? (
            <rect key={`${row}-${col}`} x={x} y={y} width="3" height="3" fill="#8B4513" />
          ) : null;
        })
      )}
      {[...Array(6)].map((_, i) => (
        <rect key={`h1-${i}`} x={10 + i * 5} y="75" width="3" height="3" fill="#8B4513" />
      ))}
      {[...Array(8)].map((_, i) => (
        <rect key={`h2-${i}`} x={140 + i * 5} y="100" width="3" height="3" fill="#8B4513" />
      ))}
      {[...Array(6)].map((_, i) => (
        <rect key={`v1-${i}`} x="75" y={90 + i * 5} width="3" height="3" fill="#8B4513" />
      ))}
      {[...Array(5)].map((_, i) => (
        <rect key={`v2-${i}`} x="110" y={140 + i * 5} width="3" height="3" fill="#8B4513" />
      ))}
    </svg>
  );

  return (
    <div className="checkin-page">
      <div className="checkin-header">
        <h2>扫码签到</h2>
        <p>向店员出示二维码即可获得积分</p>
      </div>

      <div className="qr-wrapper">
        <div className="qr-glow"></div>
        <div
          ref={qrRef}
          className="qr-container"
          onClick={() => setIsZoomed(true)}
        >
          <QRCodeDisplay size={200} />
          <div className="qr-customer-id">ID: {customerId}</div>
        </div>
      </div>

      <div className="points-card">
        <div className="points-card-label">当前积分</div>
        <div className="points-card-value">
          <span className="points-number">{displayPoints}</span>
          <span className="points-unit">分</span>
        </div>
        <div className="points-card-tip">每日签到可获得5积分</div>
      </div>

      <button
        className={`checkin-btn ${isAnimating ? 'animating' : ''}`}
        onClick={handleCheckIn}
        disabled={isAnimating}
      >
        {isAnimating ? '签到中...' : '模拟扫码签到'}
      </button>

      {errorMsg && <div className="error-msg">{errorMsg}</div>}

      <div className="checkin-tips">
        <h3>积分规则</h3>
        <ul>
          <li>每日签到可获得 5 积分</li>
          <li>每消费 10 元可获得 1 积分</li>
          <li>积分可兑换饮品和甜点</li>
        </ul>
      </div>

      {isZoomed && (
        <div className="qr-modal" onClick={() => setIsZoomed(false)}>
          <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <QRCodeDisplay size={280} />
            <p className="qr-modal-tip">点击任意位置关闭</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="success-toast">
          <div className="success-icon">✓</div>
          <div className="success-text">签到成功！+5 积分</div>
        </div>
      )}

      <style>{`
        .checkin-page {
          animation: fadeInUp 0.3s ease;
          padding-bottom: 20px;
        }

        .checkin-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .checkin-header h2 {
          color: #8B4513;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .checkin-header p {
          color: #A0522D;
          font-size: 14px;
          opacity: 0.8;
        }

        .qr-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 32px;
        }

        .qr-glow {
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 69, 19, 0.3) 0%, transparent 70%);
          animation: pulse 2s ease-in-out infinite;
          z-index: 0;
        }

        .qr-container {
          position: relative;
          z-index: 1;
          background: #ffffff;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(139, 69, 19, 0.2);
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .qr-container:hover {
          transform: scale(1.02);
        }

        .qr-customer-id {
          text-align: center;
          margin-top: 12px;
          font-size: 12px;
          color: #8B4513;
          opacity: 0.7;
        }

        .points-card {
          background: linear-gradient(135deg, #ffffff 0%, #FFF8E7 100%);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(139, 69, 19, 0.1);
          margin-bottom: 24px;
        }

        .points-card-label {
          font-size: 14px;
          color: #A0522D;
          margin-bottom: 8px;
        }

        .points-card-value {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
        }

        .points-number {
          font-size: 48px;
          font-weight: 700;
          color: #8B4513;
          line-height: 1;
        }

        .points-unit {
          font-size: 16px;
          color: #A0522D;
        }

        .points-card-tip {
          margin-top: 12px;
          font-size: 12px;
          color: #D2691E;
          opacity: 0.7;
        }

        .checkin-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
          color: #FFF8E7;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          margin-bottom: 16px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        }

        .checkin-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 69, 19, 0.4);
        }

        .checkin-btn:active {
          transform: scale(0.98);
        }

        .checkin-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-msg {
          background: rgba(205, 92, 92, 0.1);
          color: #CD5C5C;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
          margin-bottom: 16px;
        }

        .checkin-tips {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          padding: 20px;
        }

        .checkin-tips h3 {
          color: #8B4513;
          font-size: 16px;
          margin-bottom: 12px;
        }

        .checkin-tips ul {
          list-style: none;
          padding: 0;
        }

        .checkin-tips li {
          position: relative;
          padding-left: 20px;
          font-size: 14px;
          color: #5D3A1A;
          line-height: 2;
        }

        .checkin-tips li::before {
          content: '☕';
          position: absolute;
          left: 0;
        }

        .qr-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .qr-modal-content {
          background: #fff;
          padding: 30px;
          border-radius: 20px;
          animation: slideUp 0.3s ease;
        }

        .qr-modal-tip {
          text-align: center;
          margin-top: 16px;
          font-size: 13px;
          color: #999;
        }

        .success-toast {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(46, 139, 87, 0.95);
          color: #fff;
          padding: 24px 32px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 1001;
          animation: bounce 0.5s ease;
        }

        .success-icon {
          width: 48px;
          height: 48px;
          background: #fff;
          color: #2E8B57;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: bold;
        }

        .success-text {
          font-size: 16px;
          font-weight: 500;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @media (min-width: 768px) {
          .checkin-page {
            max-width: 500px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
}

export default CheckIn;
