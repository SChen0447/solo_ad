import { useMemo } from 'react';
import { Document, formatDate } from '../data/store.ts';

interface DocListProps {
  documents: Document[];
  onCardClick?: (id: string) => void;
}

function getExcerpt(content: string): string {
  const cleaned = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/[-|>]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return cleaned.length > 60 ? cleaned.substring(0, 60) + '...' : cleaned;
}

function DocCard({
  doc,
  onClick,
  index,
}: {
  doc: Document;
  onClick?: (id: string) => void;
  index: number;
}) {
  return (
    <div
      onClick={() => onClick?.(doc.id)}
      style={{
        width: '280px',
        maxWidth: '100%',
        minHeight: '220px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${doc.categoryColor}08 0%, #FFFFFF 100%)`,
        border: '1px solid #F1F5F9',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        animation: `fadeInUp 0.4s ease-out ${index * 0.02}s both`,
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.06)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: doc.categoryColor,
        }}
      />
      <div style={{ padding: '20px 20px 16px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 500,
            color: doc.categoryColor,
            background: `${doc.categoryColor}15`,
            alignSelf: 'flex-start',
            marginBottom: '12px',
          }}
        >
          {doc.category}
        </div>
        <h3
          style={{
            margin: 0,
            marginBottom: '10px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#0F172A',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {doc.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#64748B',
            lineHeight: 1.6,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {getExcerpt(doc.content)}
        </p>
      </div>
      <div
        style={{
          padding: '12px 20px 16px 24px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${doc.categoryColor}40, ${doc.categoryColor}20)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
            }}
          >
            {doc.author.avatar}
          </div>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{doc.author.name}</span>
        </div>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{formatDate(doc.updatedAt)}</span>
      </div>
    </div>
  );
}

export default function DocList({ documents, onCardClick }: DocListProps) {
  const gridStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px',
      transition: 'gap 0.3s ease',
      width: '100%',
    }),
    []
  );

  return (
    <>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @media (max-width: 1023px) and (min-width: 768px) {
            .doc-grid {
              gap: 16px !important;
            }
          }
          @media (max-width: 767px) {
            .doc-grid {
              gap: 14px !important;
            }
          }
        `}
      </style>
      {documents.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#94A3B8',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '16px', margin: 0 }}>暂无文档</p>
        </div>
      ) : (
        <div className="doc-grid" style={gridStyle}>
          {documents.map((doc, index) => (
            <DocCard key={doc.id} doc={doc} onClick={onCardClick} index={index} />
          ))}
        </div>
      )}
    </>
  );
}
