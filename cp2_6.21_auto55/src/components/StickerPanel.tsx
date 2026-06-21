import type { StickerType } from '../types';
import '../styles/stickerpanel.css';

interface StickerPanelProps {
  onSelect: (type: StickerType) => void;
}

const STICKERS: { type: StickerType; emoji: string; label: string }[] = [
  { type: 'smile', emoji: '😊', label: '笑脸' },
  { type: 'star', emoji: '⭐', label: '星星' },
  { type: 'arrow', emoji: '➡️', label: '箭头' },
  { type: 'flower', emoji: '🌸', label: '花朵' },
  { type: 'lightning', emoji: '⚡', label: '闪电' },
  { type: 'heart', emoji: '❤️', label: '爱心' },
];

function StickerPanel({ onSelect }: StickerPanelProps) {
  return (
    <div className="sticker-panel">
      <h3 className="sticker-panel-title">贴纸</h3>
      <div className="sticker-grid">
        {STICKERS.map((sticker) => (
          <button
            key={sticker.type}
            className="sticker-item-btn"
            onClick={() => onSelect(sticker.type)}
            title={sticker.label}
          >
            <span className="sticker-emoji">{sticker.emoji}</span>
          </button>
        ))}
      </div>
      <p className="sticker-tip">选择贴纸后点击画布放置</p>
    </div>
  );
}

export default StickerPanel;
