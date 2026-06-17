import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store'
import CharacterPanel from './components/CharacterPanel'
import BattleScene from './components/BattleScene'
import BattleResult from './components/BattleResult'
import { simulateBattle } from './engine/BattleEngine'

export default function App() {
  const {
    view,
    character1,
    character2,
    setView,
    setBattleData
  } = useAppStore()

  const startBattle = () => {
    const { turns, result } = simulateBattle(character1, character2)
    setBattleData(turns, result)
    setView('battle')
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px', width: '100%' }}>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: 700,
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        ⚔️ 战斗数值平衡性验证器
      </motion.h1>

      <AnimatePresence mode="wait">
        {view === 'edit' && (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px'
            }}
          >
            <CharacterPanel charId="char1" title="角色A" accentColor="#3498DB" />
            <CharacterPanel charId="char2" title="角色B" accentColor="#E74C3C" />
          </motion.div>
        )}

        {view === 'battle' && (
          <motion.div
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BattleScene />
          </motion.div>
        )}

        {view === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BattleResult />
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'edit' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}
        >
          <motion.button
            className="btn btn-start"
            onClick={startBattle}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <motion.span
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(56, 239, 125, 0.7)',
                  '0 0 0 15px rgba(56, 239, 125, 0)'
                ]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '8px'
              }}
            />
            ⚔️ 开始战斗
          </motion.button>
        </motion.div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
