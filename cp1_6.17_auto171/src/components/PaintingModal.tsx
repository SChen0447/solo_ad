import React from 'react';
import type { Painting } from '../services/dataService';

interface PaintingModalProps {
  painting: Painting | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaintingModal: React.FC<PaintingModalProps> = ({ painting, isOpen, onClose }) => {
  if (!isOpen || !painting) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(212, 160, 23, 0.5); }
          50% { box-shadow: 0 0 60px rgba(212, 160, 23, 0.8); }
        }
      `}</style>
      <div
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          backgroundColor: '#3E2723',
          border: '8px solid #D4A017',
          borderRadius: '4px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'modalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), goldGlow 2s ease-in-out infinite',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-16px',
            right: '-16px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#D4A017',
            color: '#3E2723',
            border: '3px solid #3E2723',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ✕
        </button>

        <div
          style={{
            maxWidth: '100%',
            maxHeight: '60vh',
            overflow: 'hidden',
            borderRadius: '2px',
            border: '4px solid #D4A017',
            marginBottom: '20px',
            backgroundColor: '#000'
          }}
        >
          <img
            src={painting.highResUrl}
            alt={painting.title}
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = painting.thumbnailUrl;
            }}
          />
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: '600px',
            textAlign: 'left',
            color: '#F5E6D3',
            fontFamily: '"Georgia", serif'
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              color: '#D4A017',
              marginBottom: '8px',
              borderBottom: '2px solid #D4A017',
              paddingBottom: '10px',
              letterSpacing: '1px'
            }}
          >
            {painting.title}
            <span style={{ fontSize: '16px', color: '#A08060', marginLeft: '12px' }}>
              {painting.titleEn}
            </span>
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px' }}>
            <div>
              <span style={{ color: '#A08060' }}>作者：</span>
              <span style={{ color: '#F5E6D3', fontWeight: 'bold' }}>{painting.author}</span>
            </div>
            <div>
              <span style={{ color: '#A08060' }}>创作年份：</span>
              <span style={{ color: '#F5E6D3', fontWeight: 'bold' }}>{painting.year}年</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(212, 160, 23, 0.1)',
              borderLeft: '4px solid #D4A017',
              padding: '16px',
              borderRadius: '0 4px 4px 0',
              lineHeight: '1.8',
              fontSize: '15px',
              color: '#E8D5B7'
            }}
          >
            <div style={{ color: '#D4A017', marginBottom: '8px', fontWeight: 'bold' }}>作品简介</div>
            {painting.description}
          </div>
        </div>
      </div>
    </div>
  );
};
