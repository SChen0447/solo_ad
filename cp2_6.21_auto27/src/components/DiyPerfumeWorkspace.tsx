import { usePerfumeFormula, ScentItem, NoteType } from '../hooks/usePerfumeFormula'
import ScentWheel, { WheelScent } from './ScentWheel'

interface ScentLibrary {
  id: string
  name: string
  noteType: NoteType
  emoji: string
}

const SCENT_LIBRARY: ScentLibrary[] = [
  { id: 'lib-top-1', name: '佛手柑', noteType: 'top', emoji: '🍊' },
  { id: 'lib-top-2', name: '柠檬', noteType: 'top', emoji: '🍋' },
  { id: 'lib-top-3', name: '柑橘', noteType: 'top', emoji: '🍊' },
  { id: 'lib-top-4', name: '薄荷', noteType: 'top', emoji: '🌿' },
  { id: 'lib-top-5', name: '葡萄柚', noteType: 'top', emoji: '🍊' },
  { id: 'lib-top-6', name: '橙花', noteType: 'top', emoji: '🌸' },
  { id: 'lib-top-7', name: '香柠檬', noteType: 'top', emoji: '🍋' },
  { id: 'lib-top-8', name: '海盐', noteType: 'top', emoji: '🌊' },

  { id: 'lib-mid-1', name: '薰衣草', noteType: 'middle', emoji: '💜' },
  { id: 'lib-mid-2', name: '玫瑰', noteType: 'middle', emoji: '🌹' },
  { id: 'lib-mid-3', name: '茉莉', noteType: 'middle', emoji: '🤍' },
  { id: 'lib-mid-4', name: '依兰', noteType: 'middle', emoji: '💛' },
  { id: 'lib-mid-5', name: '鸢尾', noteType: 'middle', emoji: '💙' },
  { id: 'lib-mid-6', name: '牡丹', noteType: 'middle', emoji: '🌸' },
  { id: 'lib-mid-7', name: '铃兰', noteType: 'middle', emoji: '🤍' },
  { id: 'lib-mid-8', name: '肉桂', noteType: 'middle', emoji: '🟤' },

  { id: 'lib-base-1', name: '檀香', noteType: 'base', emoji: '🪵' },
  { id: 'lib-base-2', name: '雪松', noteType: 'base', emoji: '🌲' },
  { id: 'lib-base-3', name: '麝香', noteType: 'base', emoji: '🟫' },
  { id: 'lib-base-4', name: '广藿香', noteType: 'base', emoji: '🌿' },
  { id: 'lib-base-5', name: '琥珀', noteType: 'base', emoji: '🟠' },
  { id: 'lib-base-6', name: '香草', noteType: 'base', emoji: '🍦' },
  { id: 'lib-base-7', name: '乳香', noteType: 'base', emoji: '💎' },
  { id: 'lib-base-8', name: '橡木苔', noteType: 'base', emoji: '🌳' },
]

const NOTE_BG: Record<NoteType, string> = {
  top: '#FFF3E0',
  middle: '#FCE4EC',
  base: '#EFEBE9',
}

const NOTE_COLOR: Record<NoteType, string> = {
  top: '#FFCC80',
  middle: '#F48FB1',
  base: '#BCAAA4',
}

const NOTE_LABEL: Record<NoteType, string> = {
  top: '前调',
  middle: '中调',
  base: '后调',
}

interface DiyPerfumeWorkspaceProps {
  onSaveToCommunity?: (formula: {
    name: string
    scents: ScentItem[]
  }) => void
}

export default function DiyPerfumeWorkspace({ onSaveToCommunity }: DiyPerfumeWorkspaceProps) {
  const {
    scents,
    formulaName,
    setFormulaName,
    addScent,
    removeScent,
    updateRatio,
    clearAll,
    totalRatio,
  } = usePerfumeFormula()

  const groupedScents: Record<NoteType, ScentLibrary[]> = {
    top: SCENT_LIBRARY.filter((s) => s.noteType === 'top'),
    middle: SCENT_LIBRARY.filter((s) => s.noteType === 'middle'),
    base: SCENT_LIBRARY.filter((s) => s.noteType === 'base'),
  }

  const isAdded = (id: string) => scents.some((s) => s.id === id)

  const handleSave = () => {
    if (scents.length === 0) {
      alert('请至少添加一种香料')
      return
    }
    if (!formulaName.trim()) {
      alert('请输入配方名称')
      return
    }
    onSaveToCommunity?.({ name: formulaName, scents })
    alert('配方已准备好分享！请在弹出的发帖框中完成分享。')
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', padding: 20, gap: 20 }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        {(Object.keys(groupedScents) as NoteType[]).map((noteType) => (
          <div key={noteType} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: NOTE_COLOR[noteType],
                }}
              />
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#5D4037',
                }}
              >
                {NOTE_LABEL[noteType]}
              </h3>
              <span style={{ fontSize: 12, color: '#8D6E63' }}>
                ({NOTE_LABEL[noteType] === '前调' ? '挥发快，第一印象' : NOTE_LABEL[noteType] === '中调' ? '核心香气，持久' : '基调，留香最久'})
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 120px))',
                gap: 10,
                justifyContent: 'flex-start',
              }}
            >
              {groupedScents[noteType].map((scent) => {
                const added = isAdded(scent.id)
                return (
                  <div
                    key={scent.id}
                    onClick={() => !added && addScent({ id: scent.id, name: scent.name, noteType: scent.noteType })}
                    style={{
                      background: added ? '#E0E0E0' : noteType === 'top' ? '#FFF3E0' : noteType === 'middle' ? '#FCE4EC' : '#EFEBE9',
                      borderRadius: 8,
                      padding: '12px 8px',
                      textAlign: 'center',
                      cursor: added ? 'not-allowed' : 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      border: added ? '2px solid #BDBDBD' : '2px solid transparent',
                      opacity: added ? 0.6 : 1,
                      maxWidth: 120,
                      minWidth: 100,
                      width: '100%',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!added) {
                        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{scent.emoji}</div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#4E342E',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {scent.name}
                    </div>
                    {added && (
                      <div style={{ fontSize: 11, color: '#757575', marginTop: 2 }}>已添加</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          width: 280,
          minWidth: 280,
          maxWidth: 280,
          flexShrink: 0,
          background: '#FFF8F0',
          border: '2px dashed #D7CCC8',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#5D4037',
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          调香工作台
        </h3>

        <input
          type="text"
          placeholder="输入配方名称..."
          value={formulaName}
          onChange={(e) => setFormulaName(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1.5px solid #D7CCC8',
            background: '#FFFFFF',
            fontSize: 14,
            color: '#4E342E',
            marginBottom: 12,
            width: '100%',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <ScentWheel scents={scents as WheelScent[]} size={220} />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: 4,
            marginBottom: 12,
          }}
        >
          {scents.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#A1887F',
                fontSize: 13,
                padding: '20px 0',
              }}
            >
              点击左侧香料添加到工作台
            </div>
          ) : (
            scents.map((scent) => (
              <div
                key={scent.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 8,
                  border: `1.5px solid ${NOTE_COLOR[scent.noteType]}40`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: NOTE_BG[scent.noteType],
                        fontSize: 11,
                        color: '#5D4037',
                      }}
                    >
                      {NOTE_LABEL[scent.noteType]}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#4E342E' }}>
                      {scent.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeScent(scent.id)}
                    style={{
                      background: 'none',
                      color: '#A1887F',
                      fontSize: 18,
                      lineHeight: 1,
                      padding: '0 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative', height: 20 }}>
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: 4,
                        transform: 'translateY(-50%)',
                        background: '#D7CCC8',
                        borderRadius: 2,
                      }}
                    />
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={scent.ratio}
                      onChange={(e) => updateRatio(scent.id, parseInt(e.target.value))}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: 20,
                        margin: 0,
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                    <style>{`
                      input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        background: ${NOTE_COLOR[scent.noteType]};
                        cursor: pointer;
                        border: 2px solid #FFFFFF;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                      }
                      input[type="range"]::-moz-range-thumb {
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        background: ${NOTE_COLOR[scent.noteType]};
                        cursor: pointer;
                        border: 2px solid #FFFFFF;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                      }
                    `}</style>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#5D4037',
                      minWidth: 20,
                      textAlign: 'right',
                    }}
                  >
                    {scent.ratio}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {scents.length > 0 && (
          <div
            style={{
              borderTop: '1px dashed #D7CCC8',
              paddingTop: 12,
              marginBottom: 12,
              fontSize: 12,
              color: '#8D6E63',
              textAlign: 'center',
            }}
          >
            总比例：{totalRatio} 份
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={clearAll}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              background: '#EFEBE9',
              color: '#5D4037',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            清空
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #FF8A65 0%, #FF6F00 100%)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            分享配方
          </button>
        </div>
      </div>
    </div>
  )
}
