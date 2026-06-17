import { useEffect, useState } from 'react';
import '../styles/VoteForm.css';

interface VoteFormProps {
  onSuccess?: () => void;
}

const VoteForm = ({ onSuccess }: VoteFormProps) => {
  const [stageCode, setStageCode] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const refreshCaptcha = async () => {
    try {
      const res = await fetch('/api/captcha');
      const data = await res.json();
      setCaptcha(data.captcha);
    } catch (err) {
      console.error('获取验证码失败:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stageCode || stageCode.length !== 6) {
      setMessage('请输入6位舞台编号');
      return;
    }
    if (!nickname) {
      setMessage('请输入昵称');
      return;
    }
    if (rating === 0) {
      setMessage('请选择评分');
      return;
    }
    if (!content) {
      setMessage('请输入评论内容');
      return;
    }
    if (captchaValue.toUpperCase() !== captcha) {
      setMessage('验证码错误');
      refreshCaptcha();
      return;
    }

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageCode,
          nickname,
          seatNumber,
          content,
          rating,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('提交成功！感谢您的参与');
        setStageCode('');
        setSeatNumber('');
        setNickname('');
        setRating(0);
        setContent('');
        setCaptchaValue('');
        refreshCaptcha();
        onSuccess?.();
      } else {
        setMessage(data.error || '提交失败');
      }
    } catch (err) {
      setMessage('网络错误，请稍后重试');
    }
  };

  return (
    <div className="vote-form-container">
      <div className="vote-form-card">
        <h2 className="form-title">🎤 为舞台打分</h2>
        <form onSubmit={handleSubmit} className="vote-form">
          <div className="form-row">
            <div className="form-group">
              <label>舞台编号（6位数字）</label>
              <input
                type="text"
                maxLength={6}
                value={stageCode}
                onChange={(e) => setStageCode(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入舞台编号"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>座位号</label>
              <input
                type="text"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                placeholder="如 A12"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入您的昵称"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>评分</label>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`rating-star ${star <= rating ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
              ))}
              <span className="rating-text">{rating > 0 ? `${rating} 星` : '请点击星星评分'}</span>
            </div>
          </div>

          <div className="form-group">
            <label>评论（最多200字）</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 200))}
              placeholder="分享您的观演感受..."
              className="form-textarea"
              maxLength={200}
              rows={4}
            />
            <span className="char-count">{content.length}/200</span>
          </div>

          <div className="form-group captcha-group">
            <label>验证码</label>
            <div className="captcha-row">
              <input
                type="text"
                value={captchaValue}
                onChange={(e) => setCaptchaValue(e.target.value)}
                placeholder="请输入验证码"
                className="form-input captcha-input"
                maxLength={4}
              />
              <div className="captcha-display" onClick={refreshCaptcha} title="点击刷新">
                {captcha}
              </div>
            </div>
          </div>

          {message && (
            <div className={`form-message ${message.includes('成功') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="submit-btn">
            提交评价
          </button>
        </form>
      </div>
    </div>
  );
};

export default VoteForm;
