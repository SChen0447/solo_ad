import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlantData } from './App';
import {
  saveNote,
  loadNote,
  saveLike,
  loadLike,
  generateShareId,
  saveHistory,
} from './App';

interface PlantCardProps {
  plant: PlantData;
}

function buildShareUrl(shareId: string, plantName: string): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '';
  return `${base}/plant/${encodeURIComponent(plantName)}?ref=${shareId}`;
}

function getImageUrl(prompt: string, name: string): string {
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt
  )}&image_size=landscape_4_3`;
}

function getThumbUrl(name: string): string {
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    name + ' flower botanical beautiful closeup'
  )}&image_size=square`;
}

export default function PlantCard({ plant }: PlantCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [note, setNote] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [shareId] = useState(generateShareId());

  useEffect(() => {
    setLiked(loadLike(plant.name));
    setNote(loadNote(plant.name));
    saveHistory({
      name: plant.name,
      thumbnail: getThumbUrl(plant.name),
      timestamp: Date.now(),
    });
  }, [plant.name]);

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    saveLike(plant.name, newLiked);
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 200);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    saveNote(plant.name, val);
  };

  const handleShare = async () => {
    const url = buildShareUrl(shareId, plant.name);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      alert(`分享链接：\n${url}`);
    }
  };

  const imageUrl = getImageUrl(plant.imagePrompt, plant.name);

  return (
    <div
      style={{
        maxWidth: '1000px',
        width: '100%',
        margin: '0 auto',
        padding: '32px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: '32px',
              color: '#14532d',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '6px',
            }}
          >
            {plant.name}
          </h1>
          <div
            style={{
              fontStyle: 'italic',
              color: '#6b7280',
              fontSize: '16px',
            }}
          >
            {plant.scientificName}
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            background: '#f0fdf4',
            color: '#166534',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid #bbf7d0',
          }}
        >
          ← 返回识别
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '16px',
          marginBottom: '16px',
          padding: '12px 16px',
          background: '#f0fdf4',
          borderRadius: '10px',
          borderLeft: '4px solid #22c55e',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>科属</div>
          <div style={{ color: '#14532d', fontWeight: 500 }}>{plant.family}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>分布区域</div>
          <div style={{ color: '#14532d', fontWeight: 500, lineHeight: 1.5 }}>{plant.distribution}</div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '20px',
            color: '#14532d',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          🌿 形态特征
        </h2>
        <div style={{ display: 'block' }}>
          <div
            style={{
              float: 'left',
              width: '400px',
              height: '300px',
              maxWidth: '100%',
              marginRight: '24px',
              marginBottom: '16px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#f0fdf4',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <img
              src={imageUrl}
              alt={plant.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = getThumbUrl(plant.name);
              }}
            />
          </div>
          <p
            style={{
              color: '#1f2937',
              lineHeight: 1.9,
              fontSize: '15px',
              textAlign: 'justify',
            }}
          >
            {plant.description}
          </p>
          <div style={{ clear: 'both' }} />
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '20px',
            color: '#14532d',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          🌱 生长习性
        </h2>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {plant.habitatIcons.map((h, i) => (
            <div
              key={`${h.label}-${i}`}
              style={{
                width: '120px',
                padding: '16px 8px',
                background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #bbf7d0',
                transition: 'transform 0.2s',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>{h.icon}</div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#14532d',
                  fontWeight: 500,
                }}
              >
                {h.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginBottom: '32px',
          padding: '20px',
          background: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)',
          borderRadius: '12px',
          borderLeft: '4px solid #eab308',
        }}
      >
        <h3
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '17px',
            color: '#854d0e',
            marginBottom: '8px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>💡</span> 趣味小知识
        </h3>
        <p
          style={{
            color: '#713f12',
            lineHeight: 1.8,
            fontSize: '14.5px',
          }}
        >
          {plant.funFact}
        </p>
      </div>

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '24px',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '17px',
            color: '#14532d',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          📝 我的笔记
        </h3>
        <textarea
          value={note}
          onChange={handleNoteChange}
          placeholder="在这里记录关于这种植物的观察、心得或问题... 内容会自动保存在本地"
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            lineHeight: 1.7,
            color: '#1f2937',
            background: '#fafafa',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#22c55e';
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.background = '#fafafa';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <div
          style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'right',
          }}
        >
          {note.length} 字 · 已自动保存
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleShare}
          style={{
            padding: '10px 18px',
            background: '#ffffff',
            color: '#166534',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <span>{shareCopied ? '✅' : '🔗'}</span>
          <span>{shareCopied ? '已复制链接' : '分享名片'}</span>
        </button>

        <button
          onClick={handleLike}
          style={{
            padding: '10px 20px',
            background: liked ? '#fef2f2' : '#ffffff',
            color: liked ? '#ef4444' : '#6b7280',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            border: liked ? '1px solid #fecaca' : '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <span
            className={heartAnimating ? 'heart-beat' : ''}
            style={{
              fontSize: '20px',
              color: liked ? '#ef4444' : 'currentColor',
              display: 'inline-block',
            }}
          >
            {liked ? '❤️' : '🤍'}
          </span>
          <span>{liked ? '已收藏' : '点赞收藏'}</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="max-width: '1000px'"] {
            padding: 20px !important;
          }
          div[style*="gridTemplateColumns: 'auto 1fr'"] {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          div[style*="float: 'left'"] {
            float: none !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 0 16px 0 !important;
            aspect-ratio: 4 / 3;
          }
          div[style*="display: 'flex'"][style*="justifyContent: 'space-between'"] {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          h1[style*="fontSize: '32px'"] {
            font-size: 26px !important;
          }
        }
      `}</style>
    </div>
  );
}
