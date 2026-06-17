import React, { useState, useEffect, useMemo } from 'react'
import { type Material, type PlatformType } from '../context/AppContext'
import { PLATFORM_LIMITS, PLATFORM_NAMES, validateAllPlatforms, type PlatformValidationResult } from '../api'

interface Props {
  material: Material
}

const platformList: PlatformType[] = ['weibo', 'xiaohongshu', 'wechat']

const WeiboPreview: React.FC<{ material: Material; truncateIndex?: number }> = ({ material, truncateIndex }) => {
  const displayContent = truncateIndex !== undefined
    ? material.content.slice(0, truncateIndex) + '...'
    : material.content
  const overflow = truncateIndex !== undefined

  return (
    <div
      style={{
        background: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        border: overflow ? '2px solid var(--danger)' : '1px solid #EEE',
        animation: overflow ? 'pulseBorder 1.5s ease-in-out infinite' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E6162D, #FF6B6B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          品
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>品牌官方账号</div>
          <div style={{ fontSize: 12, color: '#999' }}>刚刚</div>
        </div>
        <button
          style={{
            padding: '4px 14px',
            borderRadius: 999,
            border: '1px solid #E6162D',
            color: '#E6162D',
            background: 'transparent',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          + 关注
        </button>
      </div>

      {material.title && (
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: '#222' }}>
          {material.title}
        </div>
      )}

      <div style={{ fontSize: 14, lineHeight: 1.6, color: '#333', marginBottom: 12 }}>
        {overflow ? (
          <>
            <span>{material.content.slice(0, truncateIndex)}</span>
            <span style={{ background: 'rgba(231, 76, 60, 0.15)', borderBottom: '2px solid var(--danger)', borderRadius: 2 }}>
              {material.content[truncateIndex] || ''}
            </span>
            <span style={{ color: '#999' }}>...</span>
          </>
        ) : (
          displayContent
        )}
      </div>

      {material.images.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: material.images.length === 1 ? '1fr' : 'repeat(3, 1fr)',
            gap: 4,
            marginBottom: 12,
          }}
        >
          {material.images.slice(0, 9).map((img, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                background: '#F0F0F0',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: 12,
                overflow: 'hidden',
              }}
            >
              {img.startsWith('data:image') ? (
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '📷'
              )}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          paddingTop: 12,
          borderTop: '1px solid #F0F0F0',
          color: '#888',
          fontSize: 13,
        }}
      >
        <span>💬 评论</span>
        <span>🔄 转发</span>
        <span>👍 点赞</span>
      </div>
    </div>
  )
}

const XiaohongshuPreview: React.FC<{ material: Material; truncateIndex?: number }> = ({ material, truncateIndex }) => {
  const displayContent = truncateIndex !== undefined
    ? material.content.slice(0, truncateIndex) + '...'
    : material.content
  const overflow = truncateIndex !== undefined

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        border: overflow ? '2px solid var(--danger)' : '1px solid #EEE',
        animation: overflow ? 'pulseBorder 1.5s ease-in-out infinite' : 'none',
      }}
    >
      {material.images.length > 0 ? (
        <div
          style={{
            aspectRatio: '3/4',
            background: 'linear-gradient(135deg, #FFE4EC 0%, #FFD1DC 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {material.images[0].startsWith('data:image') ? (
            <img src={material.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 48 }}>📷</span>
          )}
        </div>
      ) : (
        <div
          style={{
            aspectRatio: '3/4',
            background: 'linear-gradient(135deg, #FFE4EC 0%, #FFD1DC 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
          }}
        >
          ✨
        </div>
      )}

      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: '#222', marginBottom: 10 }}>
          {material.title || '分享一个好东西'}
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333', marginBottom: 12 }}>
          {overflow ? (
            <>
              <span>{material.content.slice(0, truncateIndex)}</span>
              <span style={{ background: 'rgba(231, 76, 60, 0.15)', borderBottom: '2px solid var(--danger)', borderRadius: 2 }}>
                {material.content[truncateIndex] || ''}
              </span>
              <span style={{ color: '#999' }}>...</span>
            </>
          ) : (
            displayContent
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <span style={{ background: '#F5F5F5', padding: '3px 10px', borderRadius: 999, fontSize: 12, color: '#666' }}>#好物分享</span>
          <span style={{ background: '#F5F5F5', padding: '3px 10px', borderRadius: 999, fontSize: 12, color: '#666' }}>#种草推荐</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#FF2442',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              小
            </div>
            <span style={{ fontSize: 13, color: '#333' }}>小红薯</span>
          </div>
          <div style={{ display: 'flex', gap: 14, color: '#666', fontSize: 13 }}>
            <span>❤️ 128</span>
            <span>💬 24</span>
            <span>⭐ 56</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const WechatPreview: React.FC<{ material: Material; truncateIndex?: number }> = ({ material, truncateIndex }) => {
  const displayContent = truncateIndex !== undefined
    ? material.content.slice(0, truncateIndex) + '...'
    : material.content
  const overflow = truncateIndex !== undefined

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        border: overflow ? '2px solid var(--danger)' : '1px solid #EEE',
        animation: overflow ? 'pulseBorder 1.5s ease-in-out infinite' : 'none',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          background: '#ECECEC',
          fontSize: 13,
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>品牌公众号</span>
        <span style={{ marginLeft: 'auto' }}>···</span>
      </div>

      <div style={{ padding: 16 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1.4,
            color: '#333',
            marginBottom: 14,
          }}
        >
          {material.title || '一篇值得阅读的文章'}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#07C160',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            公
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>品牌官方</div>
            <div style={{ fontSize: 11, color: '#999' }}>2024-06-17 09:00</div>
          </div>
        </div>

        {material.images.length > 0 && (
          <div style={{ marginBottom: 16, borderRadius: 4, overflow: 'hidden' }}>
            {material.images[0].startsWith('data:image') ? (
              <img src={material.images[0]} alt="" style={{ width: '100%', display: 'block' }} />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: 'linear-gradient(135deg, #E8F8EF, #D4F1DE)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                }}
              >
                🖼️
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 15, lineHeight: 1.85, color: '#333', marginBottom: 20 }}>
          {overflow ? (
            <>
              <span>{material.content.slice(0, truncateIndex)}</span>
              <span style={{ background: 'rgba(231, 76, 60, 0.15)', borderBottom: '2px solid var(--danger)', borderRadius: 2 }}>
                {material.content[truncateIndex] || ''}
              </span>
              <span style={{ color: '#999' }}>...</span>
            </>
          ) : (
            <>
              {displayContent}
              <br /><br />
              <span style={{ color: '#666' }}>欢迎关注我们的公众号，获取更多精彩内容～</span>
            </>
          )}
        </div>

        <div
          style={{
            padding: '14px 0',
            borderTop: '1px solid #F0F0F0',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            justifyContent: 'space-around',
            color: '#888',
            fontSize: 14,
          }}
        >
          <span>👁️ 阅读 2.3k</span>
          <span>👍 在看 86</span>
        </div>

        <div
          style={{
            padding: '14px 0 4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#999',
            fontSize: 13,
          }}
        >
          <span>精选留言</span>
          <span>写留言</span>
        </div>
      </div>
    </div>
  )
}

const PlatformPreview: React.FC<Props> = ({ material }) => {
  const [activePlatform, setActivePlatform] = useState<PlatformType>('weibo')
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [validations, setValidations] = useState<PlatformValidationResult[]>([])

  useEffect(() => {
    let cancelled = false
    validateAllPlatforms(material.content).then(results => {
      if (!cancelled) setValidations(results)
    })
    return () => { cancelled = true }
  }, [material.content])

  const currentValidation = useMemo(
    () => validations.find(v => v.platform === activePlatform),
    [validations, activePlatform]
  )

  const handlePlatformChange = (platform: PlatformType) => {
    if (platform === activePlatform) return
    setSlideDirection(platformList.indexOf(platform) > platformList.indexOf(activePlatform) ? 'right' : 'left')
    setActivePlatform(platform)
  }

  const renderPlatformContent = () => {
    const truncateIndex = currentValidation?.truncateIndex
    switch (activePlatform) {
      case 'weibo':
        return <WeiboPreview material={material} truncateIndex={truncateIndex} />
      case 'xiaohongshu':
        return <XiaohongshuPreview material={material} truncateIndex={truncateIndex} />
      case 'wechat':
        return <WechatPreview material={material} truncateIndex={truncateIndex} />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div className="card shadow-md" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>平台预览</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {platformList.map(p => {
              const val = validations.find(v => v.platform === p)
              const hasWarning = val && !val.valid
              return (
                <button
                  key={p}
                  className="btn"
                  onClick={() => handlePlatformChange(p)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    background: activePlatform === p ? 'var(--accent-blue)' : 'transparent',
                    color: activePlatform === p ? '#FFFFFF' : hasWarning ? 'var(--danger)' : 'var(--text-secondary)',
                    border: `1px solid ${activePlatform === p ? 'var(--accent-blue)' : hasWarning ? 'var(--danger)' : 'var(--border-color)'}`,
                    borderRadius: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {PLATFORM_NAMES[p]}
                  {hasWarning && <span style={{ marginLeft: 4 }}>⚠️</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {validations.map(v => (
            <div
              key={v.platform}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                background: v.valid ? '#F8FFF8' : '#FFF5F5',
                border: `1px solid ${v.valid ? '#D4F1DE' : '#FADBD8'}`,
              }}
            >
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                {PLATFORM_NAMES[v.platform]}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: v.valid ? 'var(--success)' : 'var(--danger)' }}>
                {v.charCount} / {v.limit}
                {v.overflow > 0 && <span style={{ marginLeft: 6, fontSize: 12 }}>(超出 {v.overflow})</span>}
              </div>
            </div>
          ))}
        </div>

        <div
          className="preview-switcher"
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 0',
          }}
        >
          <div
            key={activePlatform}
            className={`preview-slide ${slideDirection === 'right' ? 'enter-right' : 'enter-left'}`}
            style={{
              width: '100%',
              maxWidth: 360,
            }}
          >
            {renderPlatformContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlatformPreview
