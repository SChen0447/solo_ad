import { useEffect, useState } from 'react'
import { Shield, CheckCircle, XCircle, Clock, User, PawPrint, Calendar, FileText, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store'
import type { AdoptionApplication } from '@/types'
import styles from './AdminPage.module.css'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const statusMap: Record<AdoptionApplication['status'], { label: string; cls: string }> = {
  pending: { label: '待审批', cls: 'statusPending' },
  approved: { label: '已通过', cls: 'statusApproved' },
  rejected: { label: '已拒绝', cls: 'statusRejected' },
}

export default function AdminPage() {
  const adoptions = useAppStore((s) => s.adoptions)
  const fetchAdoptions = useAppStore((s) => s.fetchAdoptions)
  const reviewAdoption = useAppStore((s) => s.reviewAdoption)
  const loading = useAppStore((s) => s.loading)
  const setLoading = useAppStore((s) => s.setLoading)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [reviewing, setReviewing] = useState<Set<string>>(new Set())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchAdoptions()
      setLoading(false)
    }
    load()
  }, [fetchAdoptions, setLoading])

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    if (reviewing.has(id)) return
    setReviewing((prev) => new Set(prev).add(id))
    const success = await reviewAdoption(id, status)
    if (success) {
      setFlippedCards((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
    }
    setTimeout(() => {
      setReviewing((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 400)
  }

  const handleRefresh = async () => {
    setLoading(true)
    await fetchAdoptions()
    setLoading(false)
  }

  const sorted = [...adoptions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const counts = {
    total: adoptions.length,
    pending: adoptions.filter((a) => a.status === 'pending').length,
    approved: adoptions.filter((a) => a.status === 'approved').length,
    rejected: adoptions.filter((a) => a.status === 'rejected').length,
  }

  return (
    <div className={`page-fade-enter ${styles.wrapper}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBadge}>
            <Shield size={24} color="white" />
          </div>
          <div>
            <h1 className={styles.title}>管理后台</h1>
            <p className={styles.subtitle}>审批领养申请，追踪领养记录</p>
          </div>
        </div>
        <button className="btn-ghost" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={18} className={loading ? styles.spin : ''} />
          刷新
        </button>
      </header>

      <div className={styles.stats}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>总申请数</div>
          <div className={`${styles.statValue} ${styles.statValueTotal}`}>{counts.total}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>待审批</div>
          <div className={`${styles.statValue} ${styles.statValuePending}`}>{counts.pending}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>已通过</div>
          <div className={`${styles.statValue} ${styles.statValueApproved}`}>{counts.approved}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>已拒绝</div>
          <div className={`${styles.statValue} ${styles.statValueRejected}`}>{counts.rejected}</div>
        </div>
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`card ${styles.skeletonRow} skeleton`} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <PawPrint size={48} color="#D4C4B0" />
          <h3 className={styles.emptyTitle}>暂无领养申请</h3>
          <p className={styles.emptyDesc}>等待领养人提交申请后会显示在这里</p>
        </div>
      ) : (
        <div className={styles.list}>
          {sorted.map((app) => {
            const isFlipped = flippedCards.has(app.id)
            const isReviewing = reviewing.has(app.id)
            return (
              <div
                key={app.id}
                className={`${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`}
              >
                <div className={styles.flipInner}>
                  <div className={`card ${styles.cardFront}`}>
                    <div className={styles.cardMain}>
                      <div className={styles.applicantInfo}>
                        <div className={styles.avatar}>
                          <User size={22} color="white" />
                        </div>
                        <div>
                          <h3 className={styles.applicantName}>{app.applicantName}</h3>
                          <p className={styles.applicantMeta}>
                            <PhoneInline value={app.phone} /> · {app.address}
                          </p>
                        </div>
                      </div>

                      <div className={styles.animalInfo}>
                        <PawPrint size={16} color="#F5A623" />
                        <span className={styles.animalName}>{app.animalName}</span>
                      </div>
                    </div>

                    <div className={styles.cardDetails}>
                      <div className={styles.detailItem}>
                        <Calendar size={14} />
                        <span>{formatDate(app.createdAt)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <FileText size={14} />
                        <span className={styles.reasonText}>{app.reason}</span>
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={`${styles.statusBadge} ${styles[statusMap[app.status].cls]}`}>
                        {statusMap[app.status].label}
                      </span>
                      {app.status === 'pending' && (
                        <div className={styles.actions}>
                          <button
                            className="btn-primary"
                            style={{ padding: '8px 18px' }}
                            disabled={isReviewing}
                            onClick={() => handleReview(app.id, 'approved')}
                          >
                            <CheckCircle size={16} />
                            通过
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '8px 18px' }}
                            disabled={isReviewing}
                            onClick={() => handleReview(app.id, 'rejected')}
                          >
                            <XCircle size={16} />
                            拒绝
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`card ${styles.cardBack} ${
                      app.status === 'approved' ? styles.backApproved : styles.backRejected
                    }`}
                  >
                    {app.status === 'approved' ? (
                      <CheckCircle size={48} color="white" />
                    ) : (
                      <XCircle size={48} color="white" />
                    )}
                    <h3 className={styles.backTitle}>
                      {app.status === 'approved' ? '申请已通过' : '申请已拒绝'}
                    </h3>
                    {app.reviewedAt && (
                      <p className={styles.backMeta}>
                        <Clock size={14} />
                        审核时间：{formatDate(app.reviewedAt)}
                      </p>
                    )}
                    <p className={styles.backApplicant}>
                      申请人：{app.applicantName} · {app.animalName}
                    </p>
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

function PhoneInline({ value }: { value: string }) {
  return <span>{value}</span>
}
