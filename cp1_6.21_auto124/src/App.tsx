import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, HeartHandshake, Flower2 } from 'lucide-react'
import { ShiftCalendar } from './schedule/ShiftCalendar'
import { OrderList } from './orders/OrderList'

type Tab = 'schedule' | 'orders'

export default function App() {
  const [tab, setTab] = useState<Tab>('schedule')

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #FFF5E6 0%, #FFE8EE 40%, #F7ECFF 100%)',
        fontFamily:
          '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Segoe UI", system-ui, -apple-system, sans-serif'
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '320px',
          background:
            'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(232, 160, 191, 0.25) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 0%, rgba(255, 224, 178, 0.35) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header
          style={{
            padding: '24px 28px 0',
            maxWidth: '1400px',
            margin: '0 auto'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background:
                    'linear-gradient(135deg, #E8A0BF 0%, #FFD1B8 50%, #F0B8D8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow:
                    '0 6px 18px rgba(232, 160, 191, 0.38), inset 0 1px 0 rgba(255,255,255,0.5)'
                }}
              >
                <Flower2 size={28} color="#fff" />
              </motion.div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '25px',
                    fontWeight: 800,
                    background:
                      'linear-gradient(135deg, #8B4A6B 0%, #C26A92 50%, #8B4A6B 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.5px'
                  }}
                >
                  花语轩 · 花店管理系统
                </h1>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '13px',
                    color: '#A16785',
                    fontWeight: 500
                  }}
                >
                  🌸 智能排班 · 用心传递每一份感谢 ❤️
                </p>
              </div>
            </div>

            <nav
              style={{
                display: 'flex',
                padding: '5px',
                background:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 245, 238, 0.7) 100%)',
                borderRadius: '16px',
                border: '1.5px solid rgba(232, 160, 191, 0.35)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 14px rgba(232, 160, 191, 0.12)'
              }}
            >
              {[
                { key: 'schedule' as Tab, label: '员工排班', icon: Calendar },
                { key: 'orders' as Tab, label: '订单感谢', icon: HeartHandshake }
              ].map(item => {
                const active = tab === item.key
                const Icon = item.icon
                return (
                  <motion.button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    whileHover={!active ? { scale: 1.04, y: -1 } : undefined}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      background: active
                        ? 'linear-gradient(135deg, #E8A0BF 0%, #D48AA6 100%)'
                        : 'transparent',
                      color: active ? '#fff' : '#8B4A6B',
                      fontSize: '14px',
                      fontWeight: active ? 700 : 600,
                      cursor: 'pointer',
                      boxShadow: active
                        ? '0 4px 14px rgba(232, 160, 191, 0.42)'
                        : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </motion.button>
                )
              })}
            </nav>
          </motion.div>
        </header>

        <main
          style={{
            padding: '24px 28px 48px',
            maxWidth: '1400px',
            margin: '0 auto'
          }}
        >
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'schedule' ? -12 : 12, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, duration: 0.2 }}
          >
            {tab === 'schedule' ? <ShiftCalendar /> : <OrderList />}
          </motion.div>
        </main>

        <footer
          style={{
            textAlign: 'center',
            padding: '18px 20px 32px',
            fontSize: '12px',
            color: '#C28AA6'
          }}
        >
          🌸 花语轩 Flower Shop Manager · Made with ❤️ for small businesses
        </footer>
      </div>
    </div>
  )
}
