import { useState } from 'react'
import { CouponType, getTypeColor, getTypeLabel, useAppStore } from '../store'
import { couponApi } from '../api'
import { format, addDays, startOfToday } from 'date-fns'

interface Props {
  onSuccess?: () => void
}

function CreateForm({ onSuccess }: Props) {
  const { merchants, setErrorMessage } = useAppStore()
  const today = format(startOfToday(), 'yyyy-MM-dd')
  const defaultTo = format(addDays(startOfToday(), 30), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    merchantId: merchants[0]?.id || 'm1',
    faceValue: 10,
    threshold: 50,
    validFrom: today,
    validTo: defaultTo,
    stock: 100,
    type: 'general' as CouponType,
  })
  const [submitting, setSubmitting] = useState(false)

  const update = (key: keyof typeof form, value: any) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const typeOptions: { value: CouponType; label: string }[] = [
    { value: 'general', label: '通用券' },
    { value: 'category', label: '品类券' },
    { value: 'newCustomer', label: '新客券' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (form.faceValue < 1 || form.faceValue > 1000) {
      setErrorMessage('面额范围必须在1-1000元之间')
      return
    }
    if (form.stock < 1 || form.stock > 1000) {
      setErrorMessage('库存数量必须在1-1000之间')
      return
    }
    if (form.validFrom < today) {
      setErrorMessage('起始日期不能早于当前日期')
      return
    }
    if (form.validTo < form.validFrom) {
      setErrorMessage('结束日期不能早于起始日期')
      return
    }

    setSubmitting(true)
    try {
      const merchantName = merchants.find((m) => m.id === form.merchantId)?.name || '未知商家'
      await couponApi.create({
        ...form,
        merchantName,
      })
      setErrorMessage(null)
      onSuccess?.()
      setForm((f) => ({ ...f, faceValue: 10, threshold: 50, stock: 100 }))
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || '创建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const typeColor = getTypeColor(form.type)

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 28,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1a237e',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        ✏️ 创建优惠券
      </h2>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
          }}
        >
          <div>
            <label>所属商家</label>
            <select
              value={form.merchantId}
              onChange={(e) => update('merchantId', e.target.value)}
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>优惠券类型</label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value as CouponType)}
              style={{
                borderColor: typeColor + '60',
                background: typeColor + '08',
              }}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>
              面额（元）<span style={{ color: '#ef5350' }}> *</span>
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              value={form.faceValue}
              onChange={(e) => update('faceValue', Number(e.target.value))}
              placeholder="请输入面额 1-1000"
            />
          </div>

          <div>
            <label>满减门槛（元）</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.threshold}
              onChange={(e) => update('threshold', Number(e.target.value))}
              placeholder="0 = 无门槛"
            />
          </div>

          <div>
            <label>
              有效期开始<span style={{ color: '#ef5350' }}> *</span>
            </label>
            <input
              type="date"
              min={today}
              value={form.validFrom}
              onChange={(e) => update('validFrom', e.target.value)}
            />
          </div>

          <div>
            <label>
              有效期结束<span style={{ color: '#ef5350' }}> *</span>
            </label>
            <input
              type="date"
              min={form.validFrom}
              value={form.validTo}
              onChange={(e) => update('validTo', e.target.value)}
            />
          </div>

          <div>
            <label>
              库存数量<span style={{ color: '#ef5350' }}> *</span>
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              value={form.stock}
              onChange={(e) => update('stock', Number(e.target.value))}
              placeholder="请输入库存 1-1000"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#e3f2fd',
                border: '1px dashed #42a5f5',
              }}
            >
              <div style={{ fontSize: 12, color: '#1565c0', marginBottom: 4 }}>预览信息</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a237e' }}>
                <span style={{ color: typeColor, fontSize: 18 }}>¥{form.faceValue}</span>
                {form.threshold > 0 && ` · 满¥${form.threshold}可用`}
              </div>
              <div style={{ fontSize: 11, color: '#546e7a', marginTop: 2 }}>
                共 {form.stock} 张 · {getTypeLabel(form.type)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            onClick={() => {
              setForm({
                merchantId: merchants[0]?.id || 'm1',
                faceValue: 10,
                threshold: 50,
                validFrom: today,
                validTo: defaultTo,
                stock: 100,
                type: 'general',
              })
            }}
            style={{
              padding: '11px 24px',
              background: '#f5f5f5',
              color: '#616161',
              fontWeight: 500,
            }}
          >
            重置
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '11px 36px',
              background: submitting ? '#9fa8da' : '#1a237e',
              color: '#ffffff',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              minWidth: 140,
            }}
          >
            {submitting ? '创建中...' : '🚀 确认创建'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateForm
