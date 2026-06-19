import React, { useEffect, useState } from 'react'
import type { AdoptionApplication } from '@/types'
import { fetchAdoptions, updateAdoptionStatus } from '@/services/api'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const statusLabel: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝'
}

export const AdminPage: React.FC = () => {
  const [applications, setApplications] = useState<AdoptionApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set())
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const data = await fetchAdoptions()
      setApplications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    await handleUpdate(id, 'approved')
  }

  const handleReject = async (id: string) => {
    await handleUpdate(id, 'rejected')
  }

  const handleUpdate = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id)
    try {
      const result = await updateAdoptionStatus(id, status)
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? result.application : app))
      )
      setFlippedIds((prev) => new Set(prev).add(id))
      setTimeout(() => {
        setFlippedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <h1 className="admin-title">领养申请管理</h1>
        <div className="applications-table">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: 20, borderTop: i > 0 ? '1px solid #f0f0f0' : 'none' }}>
              <div className="skeleton" style={{ height: 20, width: '30%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 16, width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <h1 className="admin-title">领养申请管理</h1>

      {!applications.length ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: 16 }}>暂无领养申请</p>
        </div>
      ) : (
        <div className="applications-table">
          <div className="applications-header">
            <div>申请人信息</div>
            <div>申请动物</div>
            <div>申请时间</div>
            <div>状态</div>
            <div>操作</div>
          </div>

          {applications.map((app) => {
            const isFlipped = flippedIds.has(app.id)
            const isProcessing = processingId === app.id

            return (
              <div key={app.id} className="flip-card" style={{ minHeight: 80 }}>
                <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
                  <div className="flip-card-front">
                    <div className="application-row">
                      <div>
                        <div style={{ fontWeight: 600 }}>{app.applicantName}</div>
                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                          {app.phone} · {app.address}
                        </div>
                      </div>
                      <div style={{ fontWeight: 500 }}>{app.animalName}</div>
                      <div style={{ fontSize: 13, color: '#666' }}>{formatDate(app.createdAt)}</div>
                      <div>
                        <span className={`status-tag status-${app.status}`}>
                          {statusLabel[app.status]}
                        </span>
                      </div>
                      <div className="application-actions">
                        {app.status === 'pending' ? (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprove(app.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? '处理中' : '通过'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleReject(app.id)}
                              disabled={isProcessing}
                            >
                              拒绝
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: 13, color: '#999' }}>
                            {app.reviewedAt ? formatDate(app.reviewedAt) : '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flip-card-back">
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background:
                            app.status === 'approved'
                              ? 'rgba(82, 196, 26, 0.15)'
                              : 'rgba(255, 77, 79, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px'
                        }}
                      >
                        {app.status === 'approved' ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52C41A" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF4D4F" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, color: app.status === 'approved' ? '#52C41A' : '#FF4D4F' }}>
                        {statusLabel[app.status]}
                      </div>
                      {app.reviewedAt && (
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                          审核时间：{formatDate(app.reviewedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
