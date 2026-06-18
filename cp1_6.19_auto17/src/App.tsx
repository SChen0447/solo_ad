import { useState, useEffect } from 'react'
import ControlPanel from './components/ControlPanel'
import PreviewPanel from './components/PreviewPanel'
import { useStore } from './store/useStore'
import { exportCSS } from './utils/exportCSS'
import clsx from 'clsx'

function App() {
  const styles = useStore((state) => state.styles)
  const panelCollapsed = useStore((state) => state.panelCollapsed)
  const togglePanel = useStore((state) => state.togglePanel)
  const setPanelCollapsed = useStore((state) => state.setPanelCollapsed)

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setPanelCollapsed(true)
      } else {
        setPanelCollapsed(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setPanelCollapsed])

  const handleExport = async () => {
    const success = await exportCSS(styles)
    if (success) {
      setToastMessage('CSS 变量已复制到剪贴板！')
    } else {
      setToastMessage('复制失败，请手动复制')
    }
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <header className="h-14 bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-between px-4 flex-shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={togglePanel}
              className="text-white p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="切换面板"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 12H21M3 6H21M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          <h1
            className="text-white font-semibold tracking-wide"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.5rem',
            }}
          >
            排版工坊
          </h1>
        </div>

        <button
          onClick={handleExport}
          className="px-5 py-2 bg-white text-[#667eea] rounded-full text-sm font-medium
                     shadow-md hover:shadow-lg hover:scale-105
                     transition-all duration-200 ease-out
                     active:scale-95"
        >
          导出 CSS
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {isMobile && panelCollapsed ? null : (
          <div
            className={clsx(
              'z-20 transition-all duration-300',
              isMobile && 'absolute inset-y-0 left-0 shadow-2xl'
            )}
          >
            <ControlPanel />
          </div>
        )}

        {isMobile && !panelCollapsed && (
          <div
            className="absolute inset-0 bg-black/30 z-10"
            onClick={togglePanel}
          />
        )}

        <div className="flex-1 overflow-hidden">
          <PreviewPanel />
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div
            className="toast-fade bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg
                       text-sm font-medium flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
