import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';

function CardExchange() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    if (user && canvasRef.current) {
      const profileUrl = `${window.location.origin}/profile/${user.id}`;
      QRCode.toCanvas(canvasRef.current, profileUrl, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'L',
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
      }, (error) => {
        if (!error) {
          setQrGenerated(true);
        }
      });
    }
  }, [user]);

  const handleScanClick = () => {
    navigate('/scanner');
  };

  const handleViewProfile = () => {
    if (user) {
      navigate(`/profile/${user.id}`);
    }
  };

  return (
    <div className="page-container exchange-page">
      <div className="page-content">
        <div className="exchange-header">
          <h1>我的二维码</h1>
          <p>扫描二维码即可交换名片</p>
        </div>

        <div className="qr-card card">
          <div className="qr-container">
            <div className="qr-frame">
              <canvas ref={canvasRef}></canvas>
              {!qrGenerated && (
                <div className="qr-loading">
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              )}
            </div>
          </div>

          <div className="qr-info">
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt="头像" className="qr-avatar" />
            )}
            <h3>{user?.name || '未设置姓名'}</h3>
            <p className="qr-position">{user?.position || '未设置职位'}</p>
            <p className="qr-company">{user?.company || '未设置公司'}</p>
          </div>
        </div>

        <div className="exchange-actions">
          <button className="btn-primary btn-large" onClick={handleScanClick}>
            <i className="fas fa-camera"></i>
            扫描交换
          </button>
          <button className="btn-secondary btn-large" onClick={handleViewProfile}>
            <i className="fas fa-eye"></i>
            预览名片
          </button>
        </div>

        <div className="exchange-tip">
          <i className="fas fa-lightbulb"></i>
          <span>提示：让对方扫描您的二维码，或扫描对方的二维码，即可完成名片交换</span>
        </div>
      </div>
    </div>
  );
}

export default CardExchange;
