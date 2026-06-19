import { useState, useEffect } from 'react'
import { getEnergyTips, EnergyTip } from '@/data/devices'
import { Lightbulb, X, Check } from 'lucide-react'

interface TipsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function TipsPanel({ isOpen, onClose }: TipsPanelProps) {
  const [tips, setTips] = useState<EnergyTip[]>([])
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setTips(getEnergyTips())
      setFadingIds(new Set())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleMarkRead = (id: string) => {
    setFadingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setTips(prev => prev.filter(t => t.id !== id))
      setFadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 500)
  }

  const allRead = tips.length === 0

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[380px] z-50 bg-sm-secondary border-l border-sm-accent/40 animate-slide-in-right flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-sm-accent/30">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-sm-action" />
            <h2 className="font-heading text-lg font-bold text-sm-text">节能小贴士</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sm-accent/30 transition-colors"
          >
            <X className="w-5 h-5 text-sm-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {allRead ? (
            <div className="flex flex-col items-center justify-center h-full text-sm-text-muted">
              <Check className="w-10 h-10 mb-3 text-sm-action" />
              <p className="text-base font-heading font-semibold">所有建议已阅读</p>
            </div>
          ) : (
            tips.map((tip, index) => (
              <div
                key={tip.id}
                className={`rounded-xl p-4 border border-sm-accent/30 ${fadingIds.has(tip.id) ? 'animate-fade-out' : ''}`}
                style={{ background: 'rgba(15,52,96,0.3)' }}
              >
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sm-action/20 text-sm-action text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-sm-text text-sm leading-relaxed flex-1">{tip.text}</p>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => handleMarkRead(tip.id)}
                    className="flex items-center gap-1 text-xs text-sm-text-muted hover:text-sm-action transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    已读
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
