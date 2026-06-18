import { useState, useRef, useEffect } from 'react'
import { useAppStore, getTypeColor, getTypeLabel, CouponInstance } from '../store'
import { couponApi, redemptionApi } from '../api'
import { format } from 'date-fns'

interface SuccessData {
  record: any
  coupon: CouponInstance
}

function Redemption() {
  const { setErrorMessage, setRedemptions, redemptions } = useAppStore()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [queryResult, setQueryResult] = useState<CouponInstance | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [showVibrate, setShowVibrate] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    redemptionApi.getAll().then(setRedemptions).catch(console.error)
  }, [])

  useEffect(() => {
    if (success) {
      setShowVibrate(true)
      const t = setTimeout(() => setShowVibrate(false), 400)
      return () => clearTimeout(t)
    }
  }, [success])

  const handleQuery = async () => {
    if (!code || !/^\d{4}$/.test(code)) {
      setQueryError('请输入4位数字核销码')
      setQueryResult(null)
      return
    }
    try {
      const res = await couponApi.getByCode(code)
      setQueryResult(res)
      setQueryError(null)
      setSuccess(null)
    } catch (err: any) {
      setQueryError(err?.response?.data?.error || '查询失败')
      setQueryResult(null)
    }
  }

  const handleRedeem = async () => {
    if (!code || !/^\d{4}$/.test(code)) {
      setErrorMessage('请输入4位数字核销码')
      return
    }
    setSubmitting(true)
    setSuccess(null)
    try {
      const res = await couponApi.redeem(code)
      setSuccess({ record: res.record, coupon: res.coupon })
      setQueryResult(null)
      setQueryError(null)
      setCode('')
      redemptionApi.getAll().then(setRedemptions).catch(console.error)
      setTimeout(() => inputRef.current?.focus(), 500)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || '核销失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!queryResult && !success) {
        handleQuery()
      } else {
        handleRedeem()
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 36,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a237e, #3949ab)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 32,
            boxShadow: '0 4px 16px rgba(26, 35, 126, 0.35)',
          }}
        >
          ✅
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#1a237e',
            marginBottom: 8,
          }}
        >
          优惠券核销台
        </h1>
        <p style={{ fontSize: 14, color: '#78909c', marginBottom: 28 }}>
          请输入顾客出示的 4 位核销码完成验证
        </p>

        <div
          style={{
            maxWidth: 420,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="请输入 4 位核销码"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setCode(val)
                setQueryError(null)
              }}
              onKeyDown={handleKeyDown}
              style={{
                textAlign: 'center',
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 16,
                padding: '16px 24px',
                borderRadius: 12,
                border: '2px solid #dcdfe6',
                fontFamily: 'monospace',
                color: '#1a237e',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleQuery}
              disabled={!code || code.length !== 4 || submitting}
              style={{
                flex: 1,
                padding: '14px 20px',
                background: !code || code.length !== 4 || submitting ? '#e0e0e0' : '#e3f2fd',
                color: !code || code.length !== 4 || submitting ? '#9e9e9e' : '#1565c0',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
              }}
            >
              🔍 查询验证
            </button>
            <button
              onClick={handleRedeem}
              disabled={!code || code.length !== 4 || submitting}
              style={{
                flex: 1,
                padding: '14px 20px',
                background: !code || code.length !== 4 || submitting ? '#9fa8da' : '#1a237e',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                cursor: !code || code.length !== 4 || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '核销中...' : '🚀 立即核销'}
            </button>
          </div>
        </div>

        {queryError && (
          <div
            style={{
              marginTop: 20,
              maxWidth: 420,
              margin: '20px auto 0',
              padding: '14px 18px',
              background: '#ffebee',
              border: '0.5px solid #ef5350',
              color: '#c62828',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            ⚠️ {queryError}
          </div>
        )}

        {queryResult && !success && (
          <div
            style={{
              marginTop: 20,
              maxWidth: 420,
              margin: '20px auto 0',
              padding: 20,
              background: '#fff3e0',
              border: '1px dashed #ffb74d',
              borderRadius: 12,
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: '#e65100',
                fontWeight: 600,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ℹ️ 优惠券信息
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: getTypeColor(queryResult.type),
                  lineHeight: 1,
                }}
              >
                ¥{queryResult.faceValue}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: '#424242', lineHeight: 1.8 }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: getTypeColor(queryResult.type) + '20',
                      color: getTypeColor(queryResult.type),
                      fontWeight: 600,
                      marginRight: 8,
                      fontSize: 12,
                    }}
                  >
                    {getTypeLabel(queryResult.type)}
                  </span>
                  {queryResult.threshold > 0 ? `满¥${queryResult.threshold}可用` : '无门槛'}
                </div>
                <div>
                  📅 {format(new Date(queryResult.validFrom), 'MM-dd')} ~{' '}
                  {format(new Date(queryResult.validTo), 'MM-dd')}
                </div>
                <div>🏪 {queryResult.merchantName}</div>
                <div>
                  状态：
                  {queryResult.redeemed ? (
                    <span style={{ color: '#78909c', fontWeight: 600 }}>已核销</span>
                  ) : queryResult.isExpired ? (
                    <span style={{ color: '#ef5350', fontWeight: 600 }}>已过期</span>
                  ) : !queryResult.isValid ? (
                    <span style={{ color: '#ff9800', fontWeight: 600 }}>未生效</span>
                  ) : (
                    <span style={{ color: '#43a047', fontWeight: 600 }}>✅ 可核销</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div
            className={showVibrate ? 'success-vibrate' : ''}
            style={{
              marginTop: 20,
              maxWidth: 420,
              margin: '20px auto 0',
              padding: 24,
              background: '#e8f5e9',
              border: '0.5px solid #66bb6a',
              borderRadius: 12,
              color: '#2e7d32',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>核销成功！</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 13,
                textAlign: 'left',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 8,
                lineHeight: 1.7,
              }}
            >
              <div>
                🎫 面额：
                <span style={{ fontWeight: 700, color: getTypeColor(success.coupon.type) }}>
                  ¥{success.coupon.faceValue}
                </span>
                {success.coupon.threshold > 0 && ` (满¥${success.coupon.threshold})`}
              </div>
              <div>🏪 商家：{success.coupon.merchantName}</div>
              <div>🔖 核销码：{success.coupon.code}</div>
              <div>
                ⏰ 核销时间：
                <span style={{ fontWeight: 600 }}>
                  {format(new Date(success.record.redeemedAt), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

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
            marginBottom: 20,
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
            📜 核销记录
          </h2>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#78909c',
              background: '#eceff1',
              padding: '4px 14px',
              borderRadius: 20,
            }}
          >
            共 {redemptions.length} 条记录
          </span>
        </div>

        {redemptions.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#90a4ae',
              border: '2px dashed #e0e0e0',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>📋</div>
            <div style={{ fontSize: 15 }}>暂无核销记录</div>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #eceff1',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 1fr 120px 160px',
                padding: '12px 20px',
                background: '#f5f7fa',
                fontSize: 12,
                fontWeight: 600,
                color: '#546e7a',
              }}
            >
              <div>编号</div>
              <div>信息</div>
              <div>商家</div>
              <div style={{ textAlign: 'center' }}>核销码</div>
              <div style={{ textAlign: 'right' }}>核销时间</div>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {[...redemptions]
                .sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime())
                .map((r, idx) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 1fr 1fr 120px 160px',
                      padding: '14px 20px',
                      borderTop: idx > 0 ? '1px solid #f0f0f0' : 'none',
                      fontSize: 13,
                      alignItems: 'center',
                      color: '#37474f',
                    }}
                  >
                    <div style={{ color: '#78909c', fontSize: 12 }}>
                      #{String(redemptions.length - idx).padStart(3, '0')}
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: '#1a237e',
                          marginRight: 8,
                        }}
                      >
                        ¥{r.faceValue}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#66bb6a',
                          fontWeight: 600,
                          padding: '2px 8px',
                          background: '#e8f5e9',
                          borderRadius: 4,
                        }}
                      >
                        已核销
                      </span>
                    </div>
                    <div style={{ color: '#455a64' }}>{r.merchantName}</div>
                    <div
                      style={{
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: 3,
                        color: '#1a237e',
                        fontSize: 14,
                      }}
                    >
                      {r.code}
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                        fontSize: 12,
                        color: '#607d8b',
                        fontFamily: 'monospace',
                      }}
                    >
                      {format(new Date(r.redeemedAt), 'MM-dd HH:mm:ss')}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Redemption
