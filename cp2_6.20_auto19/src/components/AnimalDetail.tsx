import { X, Cat, Dog, Rabbit, Heart, Stethoscope, BookOpen } from 'lucide-react'
import type { Animal } from '@/types'
import styles from './AnimalDetail.module.css'

interface Props {
  animal: Animal | null
  onClose: () => void
  onAdopt: () => void
}

const speciesIcons: Record<string, typeof Cat> = {
  猫: Cat,
  狗: Dog,
  兔: Rabbit,
}

const speciesColors: Record<string, string> = {
  猫: '#FFE0B2',
  狗: '#BBDEFB',
  兔: '#F8BBD0',
}

export default function AnimalDetail({ animal, onClose, onAdopt }: Props) {
  if (!animal) return null

  const SpeciesIcon = speciesIcons[animal.species] || Cat
  const bgColor = speciesColors[animal.species] || '#FFE0B2'

  const statusText: Record<string, string> = {
    available: '可领养',
    pending: '待审核',
    adopted: '已领养',
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <aside className={styles.panel}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
          <X size={22} />
        </button>

        <div className={styles.scrollArea}>
          <div className={styles.image} style={{ backgroundColor: bgColor }}>
            <SpeciesIcon size={96} color="#666" strokeWidth={1.2} />
            <span
              className={`${styles.statusBadge} ${styles[`status_${animal.status}`]}`}
            >
              {statusText[animal.status]}
            </span>
          </div>

          <div className={styles.content}>
            <div className={styles.header}>
              <div>
                <h2 className={styles.name}>{animal.name}</h2>
                <p className={styles.meta}>
                  {animal.species} · {animal.breed} · {animal.age}岁
                </p>
              </div>
              <button className={styles.likeBtn} aria-label="喜欢">
                <Heart size={24} color="#F5A623" fill="none" />
              </button>
            </div>

            <div className={styles.tags}>
              {animal.personality.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>

            <section className={styles.section}>
              <div className={styles.sectionTitle}>
                <BookOpen size={18} color="#F5A623" />
                <h3>它的故事</h3>
              </div>
              <p className={styles.sectionText}>{animal.story}</p>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}>
                <Stethoscope size={18} color="#4A90D9" />
                <h3>健康状况</h3>
              </div>
              <p className={styles.sectionText}>{animal.health}</p>
            </section>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={onAdopt}
            disabled={animal.status !== 'available'}
          >
            {animal.status === 'available'
              ? '申请领养'
              : animal.status === 'pending'
              ? '已有申请中'
              : '已被领养'}
          </button>
        </div>
      </aside>
    </>
  )
}
