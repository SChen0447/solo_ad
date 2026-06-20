import { useMemo } from 'react'
import { Megaphone } from 'lucide-react'
import { useAppStore } from '@/store'
import styles from './AnnouncementBar.module.css'

export default function AnnouncementBar() {
  const announcements = useAppStore((s) => s.announcements)

  const text = useMemo(
    () => announcements.map((a) => a.content).join('    •    '),
    [announcements]
  )

  if (announcements.length === 0) return null

  return (
    <div className={styles.bar}>
      <div className={styles.iconWrap}>
        <Megaphone size={18} color="#F5A623" />
      </div>
      <div className={styles.track}>
        <div className={styles.content}>
          <span>{text}</span>
          <span className={styles.spacer}>    •    </span>
          <span>{text}</span>
          <span className={styles.spacer}>    •    </span>
        </div>
      </div>
    </div>
  )
}
