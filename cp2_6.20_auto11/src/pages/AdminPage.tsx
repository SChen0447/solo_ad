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
      setApplications(
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
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
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setProcessingId(null)
    }
  }

  const toggleFlip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFlippedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="admin-container">
        <h1 className="admin-title">领养申请管理</h1>
        <div className="applications-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 24, minHeight: 140 }}>
              <div className="skeleton" style={{ height: 20, width: '30%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '50%' }} />
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
        <div className="applications-list">
          {applications.map((app) => {
            const isFlipped = flippedIds.has(app.id)
            const isProcessing = processingId === app.id
            const canFlip = app.status !== 'pending'

            return (
              <div key={app.id} className="application-card">
                <div className="flip-card">
                  <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
                    <div className="flip-card-front">
                      <div className="application-card-content">
                        <div className="application-applicant">
                          <div className="application-applicant-name">
                            {app.applicantName}
                          </div>
                          <div className="application-applicant-contact">
                            {app.phone}
                          </div>
                          <div className="application-applicant-contact">
                            {app.address}
                          </div>
                        </div>

                        <div className="application-animal">{app.animalName}</div>

                        <div className="application-time">
                          <div>申请时间</div>
                          <div style={{ marginTop: 2 }}>{formatDate(app.createdAt)}</div>
                        </div>

                        <div className="application-status">
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
                                {isProcessing ? '处理中' : '拒绝'}
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={(e) => toggleFlip(app.id, e)}
                            >
                              {isFlipped ? '查看详情' : '查看结果'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flip-card-back">
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          background:
                            app.status === 'approved'
                              ? 'rgba(82, 196, 26, 0.12)'
                              : 'rgba(255, 77, 79, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {app.status === 'approved' ? (
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#52C41A"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FF4D4F"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 18,
                          color: app.status === 'approved' ? '#52C41A' : '#FF4D4F'
                        }}
                      >
                        {statusLabel[app.status]}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          marginTop: 4
                        }}
                      >
                        <div style={{ fontSize: 13, color: '#999' }}>申请人：{app.applicantName}</div>
                        <div style={{ fontSize: 13, color: '#999' }}>领养动物：{app.animalName}</div>
                        {app.reviewedAt && (
                          <div style={{ fontSize: 13, color: '#666', marginTop: 4, fontWeight: 500 }}>
                            审核时间：{formatDate(app.reviewedAt)}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={(e) => toggleFlip(app.id, e)}
                        style={{ marginTop: 10 }}
                      >
                        返回详情
                      </button>
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
