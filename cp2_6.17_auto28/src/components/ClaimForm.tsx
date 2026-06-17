import React, { useState } from 'react';

interface ClaimFormProps {
  onClaim: (pickupCode: string) => void;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ onClaim }) => {
  const [pickupCode, setPickupCode] = useState('');
  const [error, setError] = useState('');
  const [showScanTip, setShowScanTip] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pickupCode.trim()) {
      setError('请输入取件码');
      return;
    }

    if (!/^\d{6}$/.test(pickupCode)) {
      setError('请输入6位数字取件码');
      return;
    }

    onClaim(pickupCode);
    setPickupCode('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPickupCode(value);
    if (error) setError('');
  };

  const handleScan = () => {
    setShowScanTip(true);
  };

  return (
    <div className="claim-section">
      <h2>取件入口</h2>
      <form className="claim-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={pickupCode}
          onChange={handleInputChange}
          placeholder="请输入6位取件码"
          maxLength={6}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary">
          取件
        </button>
        <button
          type="button"
          className="btn btn-secondary scan-btn"
          onClick={handleScan}
        >
          📷 扫码取件
        </button>
      </form>
      {error && (
        <div style={{ color: '#f44336', fontSize: '14px', marginTop: '12px' }}>
          {error}
        </div>
      )}

      {showScanTip && (
        <div className="modal-overlay" onClick={() => setShowScanTip(false)}>
          <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
            <h3 className="modal-title" style={{ marginBottom: '12px' }}>扫码功能即将上线</h3>
            <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
              后续将支持扫码自动识别取件码，敬请期待！
            </p>
            <button className="modal-btn" onClick={() => setShowScanTip(false)}>
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimForm;
