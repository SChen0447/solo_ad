import React, { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  eventId: string;
  size?: number;
}

const QRCode: React.FC<QRCodeProps> = ({ eventId, size = 200 }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = `${window.location.origin}/#/signin/${eventId}`;
        const dataUrl = await QRCodeLib.toDataURL(url, {
          width: size,
          margin: 2,
          color: {
            dark: '#1a365d',
            light: '#ffffff'
          }
        });
        setQrDataUrl(dataUrl);
      } catch (e) {
        setError('二维码生成失败');
        console.error('QR Code generation error:', e);
      }
    };

    generateQR();
  }, [eventId, size]);

  if (error) {
    return <div style={{ color: '#fc8181', padding: 20 }}>{error}</div>;
  }

  if (!qrDataUrl) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
      <img src={qrDataUrl} alt="签到二维码" style={{ display: 'block', width: size, height: size }} />
    </div>
  );
};

export default QRCode;
