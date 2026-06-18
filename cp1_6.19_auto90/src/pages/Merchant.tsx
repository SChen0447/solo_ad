import { useEffect, useCallback, useRef } from 'react'
import CreateForm from '../components/CreateForm'
import CouponCard from '../components/CouponCard'
import { useAppStore } from '../store'
import { couponApi, statsApi } from '../api'
import { format } from 'date-fns'

function Merchant() {
  const { templates, setTemplates, stats, setStats } = useAppStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [tpl, st] = await Promise.all([couponApi.getTemplates(), statsApi.get()])
      setTemplates(tpl)
      setStats(st)
    } catch (err) {
      console.error(err)
    }
  }, [setTemplates, setStats])

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData])

  const statCards = stats
    ? [
        {
          label: '总创建优惠券数',
          value: stats.totalCreated,
          icon: '📦',
          color: '#1a237e',
          bg: '#e8eaf6',
        },
        {
          label: '总领取数',
          value: stats.totalClaimed,
          icon: '👥',
          color: '#1976d2',
          bg: '#e3f2fd',
        },
        {
          label: '总核销数',
          value: stats.totalRedeemed,
          icon: '✅',
          color: '#388e3c',
          bg: '#e8f5e9',
        },
        {
          label: '核销率',
          value: stats.redemptionRate + '%',
          icon: '📈',
          color: '#7b1fa2',
          bg: '#f3e5f5',
        },
      ]
    : []

  const dailyData = stats?.dailyRedeem || []
  const maxCount = Math.max(...dailyData.map((d) => d.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <CreateForm onSuccess={fetchData} />

      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 28,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1a237e',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            📊 统计仪表盘
          </h2>
          <div
            style={{
              fontSize: 12,
              color: '#78909c',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#66bb6a',
                display: 'inline-block',
                animation: 'pulse 2s infinite',
              }}
            />
            每 30 秒自动刷新 · {format(new Date(), 'HH:mm:ss')}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {statCards.map((card, idx) => (
            <div
              key={idx}
              style={{
                padding: 20,
                borderRadius: 12,
                background: card.bg,
                border: `1px solid ${card.color}15`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: card.color, fontWeight: 500 }}>
                  {card.label}
                </span>
                <span style={{ fontSize: 22 }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: 24,
            background: '#fafafa',
            borderRadius: 12,
            border: '1px solid #eceff1',
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#37474f',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📅 最近 7 天核销趋势
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              height: 180,
              padding: '0 8px',
            }}
          >
            {dailyData.map((d, idx) => {
              const ratio = d.count / maxCount
              const height = Math.max(ratio * 150, d.count > 0 ? 12 : 4)
              const t = idx / Math.max(dailyData.length - 1, 1)
              const r = Math.round(0x42 + (0x7c - 0x42) * t)
              const g = Math.round(0xa5 + (0x4d - 0xa5) * t)
              const b = Math.round(0xf5 + (0xff - 0xf5) * t)
              const color = `rgb(${r}, ${g}, ${b})`
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#1a237e',
                      minHeight: 16,
                    }}
                  >
                    {d.count > 0 ? d.count : ''}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height,
                      background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                      borderRadius: '6px 6px 2px 2px',
                      transition: 'height 0.5s ease',
                      minWidth: 24,
                      boxShadow: `0 2px 8px ${color}40`,
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#78909c', fontWeight: 500 }}>{d.date}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#1a237e',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          📋 已创建优惠券列表
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#78909c',
              background: '#eceff1',
              padding: '2px 10px',
              borderRadius: 20,
            }}
          >
            {templates.length} 个活动
          </span>
        </h2>

        {templates.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: '64px 24px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              color: '#90a4ae',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📭</div>
            <div style={{ fontSize: 16, marginBottom: 4 }}>还没有创建过优惠券</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>使用上方表单创建您的第一个优惠券活动吧</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {templates.map((t) => (
              <CouponCard
                key={t.id}
                coupon={t}
                mode="merchant"
                stock={t.remainingStock ?? t.stock}
                claimedCount={t.claimedCount}
                redeemedCount={t.redeemedCount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Merchant
