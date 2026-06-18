import { useEffect, useCallback, useState } from 'react'
import CouponCard from '../components/CouponCard'
import { useAppStore } from '../store'
import { couponApi } from '../api'

function Customer() {
  const {
    availableCoupons,
    myCoupons,
    setAvailableCoupons,
    setMyCoupons,
    customerId,
    setErrorMessage,
  } = useAppStore()

  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'available' | 'mine'>('available')

  const fetchData = useCallback(async () => {
    try {
      const [avail, mine] = await Promise.all([
        couponApi.getAvailable(customerId),
        couponApi.getMine(customerId),
      ])
      setAvailableCoupons(avail)
      setMyCoupons(mine)
    } catch (err) {
      console.error(err)
    }
  }, [customerId, setAvailableCoupons, setMyCoupons])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleClaim = async (templateId: string) => {
    setClaimingId(templateId)
    try {
      await couponApi.claim(templateId, customerId)
      setErrorMessage(null)
      fetchData()
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || '领取失败，请稍后重试')
    } finally {
      setClaimingId(null)
    }
  }

  const availableCount = availableCoupons.filter((c) => c.available).length
  const mineActive = myCoupons.filter((c) => !c.redeemed && !c.isExpired).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
          borderRadius: 16,
          padding: '32px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 4px 20px rgba(26, 35, 126, 0.25)',
        }}
      >
        <div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>👋 欢迎，尊贵的顾客</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            精选优惠券，为您省钱
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            共发现 {availableCount} 张可领取优惠券 · 已持有 {mineActive} 张有效券
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 24,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{availableCount}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>可领取</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{mineActive}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>持有中</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#ffffff',
          padding: 6,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          alignSelf: 'flex-start',
        }}
      >
        {[
          { key: 'available' as const, label: '🎁 可领取', badge: availableCount },
          { key: 'mine' as const, label: '🎟️ 我的优惠券', badge: myCoupons.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: activeTab === tab.key ? '#1a237e' : 'transparent',
              color: activeTab === tab.key ? '#ffffff' : '#546e7a',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
            <span
              style={{
                padding: '1px 8px',
                borderRadius: 10,
                background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#eceff1',
                color: activeTab === tab.key ? '#ffffff' : '#78909c',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'available' && (
        <div>
          {availableCoupons.length === 0 ? (
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
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🎈</div>
              <div style={{ fontSize: 16, marginBottom: 4 }}>暂无可领取的优惠券</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>请稍后再来查看新活动</div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {availableCoupons.map((c) => (
                <CouponCard
                  key={c.id}
                  coupon={c}
                  mode="available"
                  onClaim={handleClaim}
                  claiming={claimingId === c.id}
                  claimed={c.alreadyClaimed}
                  stock={c.stock}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'mine' && (
        <div>
          {myCoupons.length === 0 ? (
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
              <div style={{ fontSize: 16, marginBottom: 4 }}>您还没有优惠券</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>去「可领取」频道挑选喜欢的优惠券吧</div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {myCoupons.map((c) => (
                <CouponCard key={c.id} coupon={c} mode="mine" />
              ))}
            </div>
          )}

          {myCoupons.some((c) => !c.redeemed && !c.isExpired && c.isValid) && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: '#e3f2fd',
                borderRadius: 10,
                border: '1px solid #90caf9',
                fontSize: 13,
                color: '#1565c0',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              💡 <strong>使用提示：</strong>点击优惠券卡片可展开查看核销码，消费时向收银员出示此码即可使用。
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Customer
