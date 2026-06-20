import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getUserRecords } from '../api'
import type { Record } from '../api'
import { useNavigate } from 'react-router-dom'
import { categoryColors } from '../styles/theme'

const ProfilePage: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await getUserRecords('demo-user')
        setRecords(data)
      } catch (err) {
        console.error('获取记录失败:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRecords()
  }, [])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 40,
          padding: 24,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: '#D4A373',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          D
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>演示用户</h2>
          <p style={{ color: '#7A5C3F', fontSize: 14 }}>
            共完成 <strong style={{ color: '#D4A373' }}>{records.length}</strong> 次改造
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 24px',
            backgroundColor: '#D4A373',
            color: '#FFFFFF',
            borderRadius: 20,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="fas fa-plus" />
          新改造
        </button>
      </div>

      <h3 style={{ fontSize: 20, marginBottom: 20 }}>我的改造记录</h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: '#D4A373' }} />
          <p style={{ marginTop: 16, color: '#7A5C3F' }}>加载中...</p>
        </div>
      ) : records.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 80,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
          }}
        >
          <i
            className="fas fa-lightbulb"
            style={{ fontSize: 48, color: '#D4A373', marginBottom: 16 }}
          />
          <p style={{ color: '#999999', fontSize: 16, marginBottom: 20 }}>
            还没有改造记录，去灵感画廊看看吧！
          </p>
          <button
            onClick={() => navigate('/gallery')}
            style={{
              padding: '10px 28px',
              backgroundColor: '#D4A373',
              color: '#FFFFFF',
              borderRadius: 20,
              fontSize: 14,
            }}
          >
            浏览灵感
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {records.map((record, index) => {
            const catColor = categoryColors[record.category] || '#95A5A6'
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 0,
                    height: 140,
                  }}
                >
                  {record.steps.finalImages.slice(0, 2).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      style={{
                        flex: 1,
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ))}
                  {record.steps.finalImages.length === 0 && (
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: '#F8F9FA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#CCCCCC',
                      }}
                    >
                      <i className="fas fa-image" style={{ fontSize: 32 }} />
                    </div>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 4,
                      backgroundColor: catColor + '20',
                      color: catColor,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {record.category}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: '#333333',
                      lineHeight: 1.5,
                      marginBottom: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {record.steps.reflection}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#999999' }}>
                      {formatDate(record.createdAt)}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#D4A373',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <i className="fas fa-tools" />
                      {record.steps.tools.length} 件工具
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProfilePage
