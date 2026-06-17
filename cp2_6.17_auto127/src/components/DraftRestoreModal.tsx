import React from 'react';
import { DraftData, formatDraftTime } from '../utils/draftStorage';

interface DraftRestoreModalProps {
  draft: DraftData;
  onRestore: () => void;
  onDiscard: () => void;
}

const DraftRestoreModal: React.FC<DraftRestoreModalProps> = ({
  draft,
  onRestore,
  onDiscard
}) => {
  const previewText = draft.content.replace(/<[^>]*>/g, '').substring(0, 200);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }} onClick={onDiscard}>
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px'
          }}>
            💾
          </div>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              发现本地草稿
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              保存于 {formatDraftTime(draft.savedAt)}
            </p>
          </div>
        </div>

        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '8px',
            fontWeight: 500
          }}>
            草稿预览：
          </div>
          <div style={{
            fontSize: '14px',
            color: '#374151',
            lineHeight: 1.6,
            maxHeight: '120px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {previewText}
            {draft.content.replace(/<[^>]*>/g, '').length > 200 && '...'}
          </div>
        </div>

        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '24px',
          lineHeight: 1.6
        }}>
          是否恢复此草稿？恢复后将覆盖当前文档内容。
        </div>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onDiscard}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 500,
              color: '#374151',
              background: '#f3f4f6',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
          >
            丢弃草稿
          </button>
          <button
            onClick={onRestore}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ✨ 恢复草稿
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftRestoreModal;
