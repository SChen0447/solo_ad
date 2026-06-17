import { VotePanelProps } from '../types'
import { getTagColor } from '../utils'

function VotePanel({ nodes, votes, userId, votingLocked, onVote, onSelectNode }: VotePanelProps) {
  const rankedNodes = Object.values(nodes)
    .filter((n) => n.parent_id !== null)
    .sort((a, b) => b.votes - a.votes)

  const getUserVote = (nodeId: string) => {
    return votes[nodeId]?.[userId] || 0
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
          🏆 实时排名
        </h3>
        {votingLocked && (
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: '#7a1f2d', color: '#ff6b6b', fontWeight: 600 }}>
            已锁定
          </span>
        )}
      </div>

      {rankedNodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#555', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💭</div>
          暂无创意节点<br/>双击画布开始创建
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rankedNodes.map((node, index) => {
            const userVote = getUserVote(node.id)
            const medals = ['🥇', '🥈', '🥉']
            const medal = index < 3 ? medals[index] : null

            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: index < 3 ? 'linear-gradient(135deg, rgba(15, 52, 96, 0.5) 0%, rgba(83, 52, 131, 0.5) 100%)' : '#1a1a2e',
                  border: index === 0 ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid #0f3460',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)'
                  e.currentTarget.style.borderColor = '#533483'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.borderColor = index === 0 ? 'rgba(255, 215, 0, 0.3)' : '#0f3460'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: index < 3 ? 'rgba(255,255,255,0.1)' : '#16213e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: medal ? 14 : 11,
                    fontWeight: 700,
                    color: medal ? undefined : '#8892b0',
                  }}>
                    {medal || `#${index + 1}`}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: node.votes >= 0 ? '#6bcf7f' : '#e94560',
                  }}>
                    {node.votes >= 0 ? '+' : ''}{node.votes}
                  </div>
                </div>

                {node.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8, paddingLeft: 30 }}>
                    {node.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 8,
                          background: getTagColor(t),
                          color: '#fff',
                          fontWeight: 500,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {!votingLocked && (
                  <div style={{ display: 'flex', gap: 6, paddingLeft: 30 }}>
                    <button
                      className="bounce-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onVote(node.id, 1)
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: 'none',
                        background: userVote === 1 ? '#1a5f3c' : 'rgba(107, 207, 127, 0.15)',
                        color: userVote === 1 ? '#fff' : '#6bcf7f',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      👍 +1
                    </button>
                    <button
                      className="bounce-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onVote(node.id, -1)
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: 'none',
                        background: userVote === -1 ? '#7a1f2d' : 'rgba(233, 69, 96, 0.15)',
                        color: userVote === -1 ? '#fff' : '#e94560',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      👎 −1
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!votingLocked && rankedNodes.length > 0 && (
        <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: 'rgba(15, 52, 96, 0.3)', border: '1px solid #0f3460' }}>
          <div style={{ fontSize: 11, color: '#8892b0', marginBottom: 4 }}>💡 提示</div>
          <div style={{ fontSize: 11, color: '#66708a', lineHeight: 1.5 }}>
            每个节点只能投一次 +1 或 −1<br/>再次点击可取消投票
          </div>
        </div>
      )}
    </div>
  )
}

export default VotePanel
