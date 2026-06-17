import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addExchange } from '../services/api';

function Scanner() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const animationRef = useRef<number>(0);
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        setCameraError('');
        requestAnimationFrame(tick);
      }
    } catch (error) {
      setCameraError('无法访问摄像头，请检查权限设置');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && !hasExchangedRef.current) {
        const userId = extractUserIdFromUrl(code.data);
        if (userId) {
          hasExchangedRef.current = true;
          handleExchange(userId);
        }
      }
    }

    animationRef.current = requestAnimationFrame(tick);
  };

  const extractUserIdFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const profileIndex = pathParts.indexOf('profile');
      if (profileIndex !== -1 && profileIndex + 1 < pathParts.length) {
        return pathParts[profileIndex + 1];
      }
    } catch {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url)) {
        return url;
      }
    }
    return null;
  };

  const handleExchange = async (targetUserId: string) => {
    if (!user) return;

    try {
      await addExchange(user.id, targetUserId);
      showToast('名片交换成功！');
      setTimeout(() => {
        navigate('/my-cards');
      }, 1500);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '交换失败', 'error');
      hasExchangedRef.current = false;
    }
  };

  const handleBack = () => {
    navigate('/exchange');
  };

  return (
    <div className="page-container scanner-page">
      <div className="scanner-header">
        <button className="back-btn" onClick={handleBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>扫描二维码</h1>
      </div>

      <div className="scanner-container">
        <div className="scanner-viewfinder">
          <video ref={videoRef} className="scanner-video" playsInline muted></video>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

          <div className="scan-frame">
            <div className="scan-corner top-left"></div>
            <div className="scan-corner top-right"></div>
            <div className="scan-corner bottom-left"></div>
            <div className="scan-corner bottom-right"></div>
            {scanning && <div className="scan-line"></div>}
          </div>

          {cameraError && (
            <div className="scanner-error">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{cameraError}</p>
              <button className="btn-primary" onClick={startCamera}>
                重试
              </button>
            </div>
          )}
        </div>

        <div className="scanner-tip">
          <i className="fas fa-info-circle"></i>
          <p>将二维码放入框内，自动扫描</p>
        </div>
      </div>
    </div>
  );
}

export default Scanner;
