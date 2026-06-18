import { useState } from 'react'
import { CouponTemplate, CouponInstance, getTypeColor, getTypeLabel } from '../store'
import { format } from 'date-fns'

interface Props {
  coupon: CouponTemplate | CouponInstance
  mode?: 'available' | 'mine' | 'merchant'
  onClaim?: (templateId: string) => void
  claiming?: boolean
  claimed?: boolean
  stock?: number
  claimedCount?: number
  redeemedCount?: number
}

function CouponCard({
  coupon,
  mode = 'available',
  onClaim,
  claiming = false,
  claimed = false,
  stock,
  claimedCount,
  redeemedCount,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const typeColor = getTypeColor(coupon.type)
  const typeLabel = getTypeLabel(coupon.type)

  const isMine = mode === 'mine'
  const isMerchant = mode === 'merchant'
  const isAvailable = mode === 'available'

  const couponInstance = isMine ? (coupon as CouponInstance) : null
  const redeemed = couponInstance?.redeemed
  const isExpired = couponInstance?.isExpired
  const isValid = couponInstance?.isValid
  const code = couponInstance?.code

  const disabled =
    (isAvailable && (claimed || (stock !== undefined && stock <= 0))) ||
    (isMine && (redeemed || isExpired || !isValid)) ||
    claiming

  const cardStatus = () => {
    if (redeemed) return { text: '已核销', bg: '#eceff1', color: '#78909c' }
    if (isExpired) return { text: '已过期', bg: '#ffebee', color: '#ef5350' }
    if (isMine && !isValid) return { text: '未生效', bg: '#fff3e0', color: '#ff9800' }
    if (isAvailable && claimed) return { text: '已领取', bg: '#e3f2fd', color: '#1976d2' }
    if (isAvailable && stock !== undefined && stock <= 0)
      return { text: '已领完', bg: '#fafafa', color: '#bdbdbd' }
    return null
  }

  const status = cardStatus()

  const validDays = (coupon as any).validDays

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: 20,
        transition: 'all 0.2s ease',
        cursor: expanded ? 'default' : 'pointer',
        border: expanded ? `1px solid ${typeColor}30` : '1px solid transparent',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      onClick={() => {
        if (isMine && !redeemed && !isExpired) setExpanded((v) => !v)
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          background: typeColor,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 20,
            background: typeColor + '15',
            color: typeColor,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {typeLabel}
        </div>

        {status && (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: status.bg,
              color: status.color,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {status.text}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: typeColor, lineHeight: 1 }}>
          ¥{coupon.faceValue}
        </span>
      </div>

      <div style={{ fontSize: 13, color: '#607d8b', marginBottom: 16 }}>
        {coupon.threshold > 0 ? (
          <span>满 ¥{coupon.threshold} 可用</span>
        ) : (
          <span>无门槛使用</span>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#90a4ae', marginBottom: 16, lineHeight: 1.8 }}>
        <div>
          📅 {format(new Date(coupon.validFrom), 'yyyy-MM-dd')} 至{' '}
          {format(new Date(coupon.validTo), 'yyyy-MM-dd')}
        </div>
        {validDays !== undefined && validDays > 0 && !isExpired && !redeemed && (
          <div style={{ color: typeColor, fontWeight: 500 }}>⏰ 还剩 {validDays} 天有效</div>
        )}
        {isMerchant && (
          <>
            <div>📊 库存：{stock ?? coupon.stock} / 初始 {coupon.initialStock}</div>
            <div>
              👥 已领 {claimedCount ?? 0} · ✅ 已核 {redeemedCount ?? 0}
            </div>
          </>
        )}
        <div style={{ marginTop: 4, color: '#78909c' }}>🏪 {coupon.merchantName}</div>
      </div>

      {isMine && expanded && code && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: '#e3f2fd',
            borderRadius: 10,
            textAlign: 'center',
            border: '1px dashed #42a5f5',
          }}
        >
          <div style={{ fontSize: 12, color: '#1565c0', marginBottom: 6, fontWeight: 500 }}>
            核销码（请出示给收银员）
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: '#1a237e',
              letterSpacing: 8,
              fontFamily: 'monospace',
            }}
          >
            {code}
          </div>
        </div>
      )}

      {isAvailable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled && onClaim) onClaim(coupon.id)
          }}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '11px 16px',
            background: disabled ? '#e0e0e0' : typeColor,
            color: disabled ? '#9e9e9e' : '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            opacity: disabled ? 0.8 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {claiming ? '领取中...' : claimed ? '已领取' : stock !== undefined && stock <= 0 ? '已领完' : '立即领取'}
        </button>
      )}
    </div>
  )
}

export default CouponCard
