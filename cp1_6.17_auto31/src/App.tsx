import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Create from './pages/Create'
import Draw from './pages/Draw'
import Admin from './pages/Admin'
import { GiftOutlined, SettingOutlined, PlayCircleOutlined } from '@ant-design/icons'

const Home = () => {
  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.logo}>
          <GiftOutlined style={{ fontSize: 56, color: '#e94560' }} />
        </div>
        <h1 style={styles.title}>幸运大转盘</h1>
        <p style={styles.subtitle}>多人协作 · 实时抽奖</p>
      </div>

      <div style={styles.cardList}>
        <Link to="/create" style={styles.card}>
          <div style={{ ...styles.cardIcon, background: 'linear-gradient(135deg, #e94560, #ff6b9d)' }}>
            <SettingOutlined style={{ fontSize: 28 }} />
          </div>
          <div style={styles.cardContent}>
            <h3 style={styles.cardTitle}>创建活动</h3>
            <p style={styles.cardDesc}>配置奖项，生成抽奖活动</p>
          </div>
        </Link>

        <div style={styles.card} onClick={() => alert('请通过分享链接或扫码进入抽奖页面')}>
          <div style={{ ...styles.cardIcon, background: 'linear-gradient(135deg, #0f3460, #533483)' }}>
            <PlayCircleOutlined style={{ fontSize: 28 }} />
          </div>
          <div style={styles.cardContent}>
            <h3 style={styles.cardTitle}>参与抽奖</h3>
            <p style={styles.cardDesc}>扫码或点击链接进入</p>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <p>转动幸运转盘，赢取惊喜好礼 🎁</p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/draw/:code" element={<Draw />} />
        <Route path="/admin/:id" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '40px 20px',
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column'
  },
  hero: {
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 48
  },
  logo: {
    display: 'inline-block',
    padding: 20,
    background: 'rgba(233, 69, 96, 0.15)',
    borderRadius: '50%',
    marginBottom: 20,
    animation: 'float 3s ease-in-out infinite'
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #e94560 0%, #533483 50%, #0f3460 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 12
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8'
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: 20,
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    textDecoration: 'none',
    color: '#fff',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    animation: 'fadeInUp 0.6s ease backwards'
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0
  },
  cardContent: {
    flex: 1
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8'
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    paddingTop: 40,
    color: '#64748b',
    fontSize: 14
  }
}

export default App
