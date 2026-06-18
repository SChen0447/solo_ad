interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

const LoadingOverlay = ({ visible, text = '正在生成...' }: LoadingOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner">
          <svg className="spinner-svg" viewBox="0 0 50 50">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            <circle
              className="spinner-circle"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="loading-text">{text}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
