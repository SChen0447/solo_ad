import React from 'react'
import { Trash2 } from 'lucide-react'

interface TemplateItem {
  id: string
  name: string
  thumbnail: string
}

interface TemplateLibraryProps {
  templates: TemplateItem[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export default function TemplateLibrary({
  templates,
  onLoad,
  onDelete,
}: TemplateLibraryProps) {
  if (templates.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        textAlign: 'center',
        color: '#9CA3AF',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280', marginBottom: 4 }}>
          暂无模板
        </div>
        <div style={{ fontSize: 12 }}>
          保存设计后，模板将显示在这里
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, 160px)',
      gap: 16,
      padding: 16,
    }}>
      {templates.map((template) => (
        <div
          key={template.id}
          onClick={() => onLoad(template.id)}
          style={{
            width: 160,
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}
          className="template-item"
        >
          <div style={{
            position: 'relative',
            width: 160,
            height: 224,
            backgroundColor: '#F9FAFB',
            overflow: 'hidden',
          }}>
            {template.thumbnail ? (
              <img
                src={template.thumbnail}
                alt={template.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F3F4F6',
                color: '#9CA3AF',
                fontSize: 12,
              }}>
                暂无预览
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(template.id)
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 26,
                height: 26,
                border: 'none',
                borderRadius: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              className="template-delete-btn"
              title="删除模板"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #F3F4F6',
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#374151',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {template.name}
            </div>
          </div>

          <style>{`
            .template-item:hover {
              box-shadow: 0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08);
              transform: translateY(-2px);
            }
            .template-item:hover .template-delete-btn {
              opacity: 1;
            }
            .template-delete-btn:hover {
              background-color: rgba(220, 38, 38, 1) !important;
            }
          `}</style>
        </div>
      ))}
    </div>
  )
}
