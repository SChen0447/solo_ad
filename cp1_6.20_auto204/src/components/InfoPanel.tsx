import { motion, AnimatePresence } from 'framer-motion';
import { BoneData } from '@/utils/boneData';

interface InfoPanelProps {
  bone: BoneData | null;
  onClose: () => void;
}

const InfoPanel = ({ bone, onClose }: InfoPanelProps) => {
  const generateThumbnail = (bone: BoneData) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1E1E2A';
      ctx.fillRect(0, 0, 200, 120);
      ctx.fillStyle = '#D2C8B0';
      ctx.strokeStyle = '#D2C8B0';
      ctx.lineWidth = 2;
      
      const cx = 100;
      const cy = 60;
      
      if (bone.shape === 'cylinder') {
        ctx.beginPath();
        ctx.ellipse(cx, cy - 20, 25, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 25, cy - 20);
        ctx.lineTo(cx - 25, cy + 20);
        ctx.moveTo(cx + 25, cy - 20);
        ctx.lineTo(cx + 25, cy + 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy + 20, 25, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (bone.shape === 'sphere') {
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy, 25, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(cx - 25, cy - 20, 50, 40);
      }
      
      ctx.fillStyle = '#F0E6D3';
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.fillText(bone.latinName, cx, 110);
    }
    return canvas.toDataURL();
  };

  return (
    <AnimatePresence>
      {bone && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            top: '50%',
            right: '24px',
            transform: 'translateY(-50%)',
            width: '320px',
            maxHeight: '80vh',
            overflowY: 'auto',
            borderRadius: '12px',
            background: 'rgba(20, 20, 30, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            fontFamily: "'Times New Roman', Georgia, serif",
          }}
        >
          <div style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#F0E6D3',
                    margin: 0,
                    marginBottom: '4px',
                  }}
                >
                  {bone.name}
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    fontStyle: 'italic',
                    color: '#A0C4E8',
                    margin: 0,
                  }}
                >
                  {bone.latinName}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E0D8C6',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.3s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                fontSize: '11px',
                fontStyle: 'italic',
                color: '#A0C4E8',
                marginBottom: '16px',
              }}
            >
              发现于 {bone.discoveryYear} 年 · {bone.discoverer}
            </div>

            <div
              style={{
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '16px',
                background: '#1E1E2A',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <img
                src={generateThumbnail(bone)}
                alt={bone.name}
                style={{
                  width: '100%',
                  height: '80px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#FFA07A',
                  margin: 0,
                  marginBottom: '8px',
                }}
              >
                骨骼描述
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#F0E6D3',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {bone.description}
              </p>
            </div>

            <div>
              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#FFA07A',
                  margin: 0,
                  marginBottom: '8px',
                }}
              >
                主要功能
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#F0E6D3',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {bone.function}
              </p>
            </div>

            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '11px',
                color: '#888',
                fontStyle: 'italic',
              }}
            >
              分类：{bone.group === 'head' ? '头部骨骼' : bone.group === 'torso' ? '躯干骨骼' : bone.group === 'forelimb' ? '前肢骨骼' : '后肢骨骼'}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InfoPanel;
