import { useNavigate } from 'react-router-dom'
import { useStore, CATEGORY_COLORS } from '../data/store'
import type { Document } from '../data/store'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const day = 86400000
  if (diff < day) return '今天'
  if (diff < 2 * day) return '昨天'
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function extractPreview(content: string): string {
  const lines = content.split('\n').filter(l => l.trim())
  const noMarkdown = lines
    .slice(0, 3)
    .join(' ')
    .replace(/[#*`_~\[\]()]/g, '')
    .trim()
  return noMarkdown.length > 70 ? noMarkdown.slice(0, 70) + '...' : noMarkdown
}

interface DocCardProps {
  doc: Document
  onClick: () => void
}

function DocCard({ doc, onClick }: DocCardProps) {
  const color = CATEGORY_COLORS[doc.colorIndex % CATEGORY_COLORS.length]

  return (
    <div
      onClick={onClick}
      style={{
        width: 280,
        maxWidth: '100%',
        borderRadius: 12,
        background: `linear-gradient(160deg, #EFF6FF 0%, #FFFFFF 55%, #FFFFFF 100%)`,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        display: 'flex',
        position: 'relative',
        willChange: 'transform, box-shadow'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 10px 20px rgba(15, 23, 42, 0.08), 0 4px 8px rgba(15, 23, 42, 0.06)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div
        style={{
          width: 4,
          flexShrink: 0,
          background: color,
          borderRadius: '12px 0 0 12px'
        }}
      />
      <div style={{ flex: 1, padding: '18px 18px 16px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 20,
              background: color + '15',
              color: color,
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1.4,
              border: `1px solid ${color}25`
            }}
          >
            {doc.category}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            v{doc.versions.length}
          </span>
        </div>

        <h3
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 15,
            fontWeight: 600,
            color: '#0F172A',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {doc.title}
        </h3>

        <p
          style={{
            margin: 0,
            marginBottom: 14,
            fontSize: 12.5,
            color: '#64748B',
            lineHeight: 1.55,
            minHeight: 38,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {extractPreview(doc.content)}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid #F1F5F9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${color}, #8B5CF6)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 10,
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              {doc.author.charAt(0)}
            </div>
            <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 500 }}>
              {doc.author}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {formatDate(doc.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function DocList() {
  const { state } = useStore()
  const navigate = useNavigate()

  const docs = state.documents

  return (
    <div style={{ padding: '32px 24px 60px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              color: '#0F172A',
              lineHeight: 1.3
            }}
          >
            团队文档库
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748B' }}>
            共 <span style={{ color: '#2563EB', fontWeight: 600 }}>{docs.length}</span> 篇文档 ·
            支持实时协作编辑、版本对比与全文搜索
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: 'white',
              color: '#475569',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0' }}
          >
            🔗 分享空间
          </button>
          <button
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2563EB',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            + 新建文档
          </button>
        </div>
      </div>

      <div
        className="doc-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 280px)',
          gap: 24,
          transition: 'gap 0.25s ease',
          justifyContent: 'flex-start'
        }}
      >
        {docs.map(doc => (
          <DocCard
            key={doc.id}
            doc={doc}
            onClick={() => navigate(`/doc/${doc.id}`)}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .doc-grid {
            gap: 20px;
            justify-content: center;
          }
        }
        @media (max-width: 767px) {
          .doc-grid {
            gap: 16px;
            grid-template-columns: 1fr;
          }
          .doc-grid > div {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .doc-grid {
            gap: 20px;
            grid-template-columns: repeat(2, 280px);
          }
        }
      `}</style>
    </div>
  )
}
