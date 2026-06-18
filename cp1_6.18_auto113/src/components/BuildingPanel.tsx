import { useState, useEffect, useMemo } from 'react'
import { useStore, STYLE_CONFIG } from '@store/useStore'
import { BuildingAnalyzer } from '@modules/StyleManager'

const panelBaseStyle: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(32, 24, 18, 0.88) 0%, rgba(20, 15, 12, 0.92) 100%)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(201, 169, 110, 0.35)',
  borderRadius: '12px',
  boxShadow:
    '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(201, 169, 110, 0.12), inset 0 1px 0 rgba(255, 246, 224, 0.06)',
  color: '#e8d4a0',
  fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
  overflow: 'hidden',
}

function InfoPopup() {
  const selectedBuilding = useStore((s) => s.selectedBuilding)
  const buildings = useStore((s) => s.buildings)

  const [visible, setVisible] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    if (selectedBuilding) {
      setAnimKey((k) => k + 1)
      setVisible(true)
      const timer = setTimeout(() => {
        if (useStore.getState().selectedBuilding?.id === selectedBuilding.id) {
          // keep visible
        }
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [selectedBuilding])

  const otherBuildingsSameEra = useMemo(() => {
    if (!selectedBuilding) return 0
    return buildings.filter(
      (b) =>
        b.style === selectedBuilding.style &&
        Math.abs(b.year - selectedBuilding.year) < 100 &&
        b.id !== selectedBuilding.id
    ).length
  }, [buildings, selectedBuilding])

  if (!selectedBuilding) return null

  const cfg = STYLE_CONFIG[selectedBuilding.style]

  return (
    <>
      {visible && (
        <div
          key={`mask-${animKey}`}
          onClick={() => useStore.getState().selectBuilding(null)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 15,
            animation: 'fadeIn 0.3s ease forwards',
          }}
        />
      )}
      {visible && (
        <div
          key={`panel-${animKey}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...panelBaseStyle,
            position: 'absolute',
            top: '80px',
            right: '40px',
            width: '320px',
            zIndex: 20,
            padding: '24px',
            animation: 'slideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            opacity: 0,
            transform: 'translateY(-40px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10px',
                  color: cfg.tint.getStyle(),
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  opacity: 0.8,
                }}
              >
                {cfg.name}建筑 · ANCIENT ARCHITECTURE
              </div>
              <h2
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#fff6e0',
                  margin: 0,
                  textShadow: `0 0 14px ${cfg.tint.getStyle()}60`,
                  fontFamily: 'Georgia, "KaiTi", serif',
                  letterSpacing: '2px',
                }}
              >
                {selectedBuilding.name}
              </h2>
            </div>
            <button
              onClick={() => useStore.getState().selectBuilding(null)}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1.15)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#ffaa66'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#a89070'
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#a89070',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
                transition: 'all 0.3s ease',
                borderRadius: '4px',
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <InfoItem label="建造年代" value={`公元 ${selectedBuilding.year} 年`} accent={cfg.tint.getStyle()} />
            <InfoItem label="建筑风格" value={cfg.name} accent={cfg.tint.getStyle()} />
            <InfoItem
              label="建筑尺寸"
              value={`${selectedBuilding.dimensions.width}×${selectedBuilding.dimensions.depth}×${selectedBuilding.dimensions.height}m`}
              accent={cfg.tint.getStyle()}
            />
            <InfoItem
              label="同期建筑"
              value={`${otherBuildingsSameEra} 座`}
              accent={cfg.tint.getStyle()}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                color: '#a89070',
                marginBottom: '10px',
                letterSpacing: '1px',
              }}
            >
              ◆ 风格特征
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedBuilding.features.map((f, i) => (
                <span
                  key={i}
                  style={{
                    padding: '6px 12px',
                    background: `linear-gradient(90deg, ${cfg.tint.getStyle()}15, ${cfg.tint.getStyle()}08)`,
                    border: `1px solid ${cfg.tint.getStyle()}40`,
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#e8d4a0',
                    animation: `fadeIn 0.3s ease ${i * 0.1}s both`,
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${cfg.tint.getStyle()}20`,
              paddingTop: '16px',
              display: 'flex',
              gap: '10px',
            }}
          >
            <button
              onClick={() => useStore.getState().openDetailPanel(selectedBuilding)}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1.06)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1)'
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: `linear-gradient(180deg, ${cfg.tint.getStyle()}30, ${cfg.tint.getStyle()}12)`,
                border: `1px solid ${cfg.tint.getStyle()}60`,
                borderRadius: '8px',
                color: '#fff6e0',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: 500,
                boxShadow: `0 0 12px ${cfg.tint.getStyle()}25`,
                letterSpacing: '1px',
              }}
            >
              ⛩ 查看建筑详情
            </button>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0 }
              to { opacity: 1 }
            }
            @keyframes slideDown {
              0% { opacity: 0; transform: translateY(-40px) scale(0.95); }
              60% { opacity: 1; transform: translateY(8px) scale(1.01); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}

function InfoItem({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'rgba(201, 169, 110, 0.06)',
        borderRadius: '8px',
        border: `1px solid ${accent}18`,
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#8a7a60',
          marginBottom: '4px',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#fff6e0',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function DetailPanel() {
  const isDetailPanelOpen = useStore((s) => s.isDetailPanelOpen)
  const detailBuilding = useStore((s) => s.detailBuilding)
  const closeDetailPanel = useStore((s) => s.closeDetailPanel)

  const [isAnimating, setIsAnimating] = useState<'in' | 'out' | null>(null)

  useEffect(() => {
    if (isDetailPanelOpen) {
      setIsAnimating('in')
    } else if (isAnimating === 'in') {
      setIsAnimating('out')
      const timer = setTimeout(() => setIsAnimating(null), 500)
      return () => clearTimeout(timer)
    }
  }, [isDetailPanelOpen])

  const views = useMemo(() => {
    if (!detailBuilding) return null
    return BuildingAnalyzer.generateThreeViews(
      detailBuilding.dimensions,
      detailBuilding.style
    )
  }, [detailBuilding])

  const shouldRender = isDetailPanelOpen || isAnimating !== null
  if (!shouldRender || !detailBuilding || !views) return null

  const cfg = STYLE_CONFIG[detailBuilding.style]

  const getAnimStyle = (): React.CSSProperties => {
    if (isAnimating === 'in') {
      return {
        animation: 'slideInRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      }
    }
    if (isAnimating === 'out') {
      return {
        animation: 'slideOutRight 0.5s cubic-bezier(0.55, 0, 0.68, 0.53) forwards',
      }
    }
    return {}
  }

  return (
    <>
      <div
        onClick={closeDetailPanel}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            isAnimating === 'out'
              ? 'rgba(0, 0, 0, 0)'
              : 'rgba(10, 8, 6, 0.4)',
          backdropFilter:
            isAnimating === 'out' ? 'blur(0px)' : 'blur(3px)',
          WebkitBackdropFilter:
            isAnimating === 'out' ? 'blur(0px)' : 'blur(3px)',
          zIndex: 25,
          transition: 'all 0.5s ease',
        }}
      />

      <div
        style={{
          ...panelBaseStyle,
          position: 'absolute',
          left: '24px',
          top: '60px',
          bottom: '180px',
          width: '420px',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(-120%)',
          ...getAnimStyle(),
        }}
      >
        <div
          style={{
            padding: '28px 28px 20px',
            borderBottom: `1px solid ${cfg.tint.getStyle()}20`,
            background: `linear-gradient(180deg, ${cfg.tint.getStyle()}08 0%, transparent 100%)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '4px',
                  height: '28px',
                  background: `linear-gradient(180deg, ${cfg.tint.getStyle()}, ${cfg.roofColor.getStyle()})`,
                  borderRadius: '2px',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: cfg.tint.getStyle(),
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    opacity: 0.85,
                  }}
                >
                  建筑档案 · BUILDING ARCHIVE
                </div>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#fff6e0',
                    margin: '4px 0 0 0',
                    fontFamily: 'Georgia, "KaiTi", serif',
                    letterSpacing: '3px',
                    textShadow: `0 0 18px ${cfg.tint.getStyle()}50`,
                  }}
                >
                  {detailBuilding.name}
                </h2>
              </div>
            </div>
            <button
              onClick={closeDetailPanel}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.transform = 'scale(1.15)'
                el.style.background = 'rgba(255, 100, 80, 0.15)'
                el.style.color = '#ff7755'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.transform = 'scale(1)'
                el.style.background = 'rgba(201, 169, 110, 0.1)'
                el.style.color = '#a89070'
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(201, 169, 110, 0.1)',
                border: '1px solid rgba(201, 169, 110, 0.3)',
                color: '#a89070',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
          }}
        >
          <Section title="基本信息" accent={cfg.tint.getStyle()}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <DetailInfoItem label="建造年代" value={`公元 ${detailBuilding.year} 年`} />
              <DetailInfoItem label="所属朝代" value={cfg.name} />
              <DetailInfoItem label="建筑宽度" value={`${detailBuilding.dimensions.width} m`} />
              <DetailInfoItem label="建筑进深" value={`${detailBuilding.dimensions.depth} m`} />
              <DetailInfoItem label="建筑高度" value={`${detailBuilding.dimensions.height} m`} />
              <DetailInfoItem
                label="占地面积"
                value={`${(detailBuilding.dimensions.width * detailBuilding.dimensions.depth).toFixed(1)} ㎡`}
              />
            </div>
          </Section>

          <Section title="三维拆解图" accent={cfg.tint.getStyle()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ViewCard
                title="正视图 (Front View)"
                svg={views.frontView.svg}
                labels={views.frontView.labels}
                accent={cfg.tint.getStyle()}
              />
              <ViewCard
                title="侧视图 (Side View)"
                svg={views.sideView.svg}
                labels={views.sideView.labels}
                accent={cfg.tint.getStyle()}
              />
              <ViewCard
                title="俯视图 (Top View)"
                svg={views.topView.svg}
                labels={views.topView.labels}
                accent={cfg.tint.getStyle()}
              />
            </div>
          </Section>

          <Section title="建筑风格特征" accent={cfg.tint.getStyle()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {detailBuilding.features.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    background: `linear-gradient(90deg, ${cfg.tint.getStyle()}10, transparent)`,
                    borderRadius: '8px',
                    borderLeft: `3px solid ${cfg.tint.getStyle()}80`,
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      minWidth: '22px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${cfg.tint.getStyle()}, ${cfg.roofColor.getStyle()})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#1a1410',
                      fontWeight: 700,
                      boxShadow: `0 0 8px ${cfg.tint.getStyle()}50`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#e8d4a0',
                      lineHeight: 1.7,
                      paddingTop: '2px',
                    }}
                  >
                    {f}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="历史背景" accent={cfg.tint.getStyle()}>
            <p
              style={{
                fontSize: '13px',
                color: '#c8b890',
                lineHeight: 1.9,
                margin: 0,
                textIndent: '2em',
              }}
            >
              {getEraDescription(detailBuilding.style, detailBuilding.year)}
            </p>
          </Section>
        </div>

        <style>{`
          @keyframes slideInRight {
            0% { transform: translateX(-120%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOutRight {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(120%); opacity: 0; }
          }
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(201,169,110,0.05);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(201,169,110,0.3);
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(201,169,110,0.5);
          }
        `}</style>
      </div>
    </>
  )
}

function Section({
  title,
  accent,
  children,
}: {
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            width: '18px',
            height: '2px',
            background: `linear-gradient(90deg, ${accent}, transparent)`,
          }}
        />
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: accent,
            margin: 0,
            letterSpacing: '2px',
          }}
        >
          {title}
        </h3>
        <div
          style={{
            flex: 1,
            height: '1px',
            background: `linear-gradient(90deg, ${accent}30, transparent)`,
          }}
        />
      </div>
      {children}
    </div>
  )
}

function DetailInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'rgba(255, 246, 224, 0.03)',
        borderRadius: '6px',
        border: '1px solid rgba(201, 169, 110, 0.12)',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#8a7a60',
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#fff6e0',
          fontFamily: 'Georgia, monospace',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function ViewCard({
  title,
  svg,
  accent,
}: {
  title: string
  svg: string
  labels: { text: string; x: number; y: number }[]
  accent: string
}) {
  return (
    <div
      style={{
        background:
          'linear-gradient(180deg, rgba(255, 246, 224, 0.04) 0%, rgba(0, 0, 0, 0.15) 100%)',
        borderRadius: '10px',
        border: `1px solid ${accent}22`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${accent}18`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: `linear-gradient(90deg, ${accent}08, transparent)`,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: accent,
            fontWeight: 500,
            letterSpacing: '1px',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#8a7a60',
          }}
        >
          比例 · 1:100
        </span>
      </div>
      <div
        style={{
          padding: '12px',
          background:
            'repeating-linear-gradient(0deg, rgba(201,169,110,0.03) 0px, rgba(201,169,110,0.03) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(90deg, rgba(201,169,110,0.03) 0px, rgba(201,169,110,0.03) 1px, transparent 1px, transparent 16px)',
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          style={{
            width: '100%',
            maxHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '18px',
            marginTop: '10px',
            flexWrap: 'wrap',
          }}
        >
          {labels.map((l, i) => (
            <span
              key={i}
              style={{
                fontSize: '11px',
                color: '#a89070',
                padding: '3px 10px',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '10px',
                border: '1px solid rgba(201, 169, 110, 0.15)',
              }}
            >
              📏 {l.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function getEraDescription(style: string, year: number): string {
  const descs: Record<string, string> = {
    tang: `唐代是中国古代建筑发展的成熟时期，建筑风格气魄宏伟，严整开朗。公元${year}年前后正值${year < 750 ? '盛唐' : '中晚唐'}时期，都城长安规模宏大，坊市整齐，建筑技术达到了新的高度。斗拱硕大有力，出檐深远，给人以端庄稳重之感，色彩以朱白灰为主，简朴而不失华美。`,
    song: `宋代建筑在唐代基础上进一步发展，风格趋向精巧秀丽。公元${year}年处于${year < 1127 ? '北宋' : '南宋'}时期，城市经济繁荣，建筑技术和艺术都有显著进步。斗拱比例减小，飞檐翘角向上反曲，形成优美的弧线，门窗棂花丰富多样，装饰日趋精致，体现了宋代典雅细腻的审美情趣。`,
    mingqing: `明清时期是中国古代建筑的最后一个高峰。公元${year}年正值${year < 1644 ? '明代' : year < 1800 ? '清代中期' : '清代晚期'}，官式建筑高度标准化、定型化。紫禁城作为集大成者，红墙黄瓦，金碧辉煌，彩画精美绝伦，屋脊装饰繁复华丽，体现了皇家的威严与奢华，建筑技艺达到了封建社会的巅峰。`,
  }
  return descs[style] || descs.tang
}

export function BuildingPanel() {
  return (
    <>
      <InfoPopup />
      <DetailPanel />
    </>
  )
}
