import { useStore, VIEW_PRESETS } from '@/store/useStore'

export default function ViewIndicator() {
  const currentView = useStore((s) => s.currentView)
  return <div className="view-indicator glass">{VIEW_PRESETS[currentView].name}</div>
}
