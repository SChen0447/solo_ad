import type { Animal } from '@/types'
import { Heart, Cat, Dog, Rabbit } from 'lucide-react'
import styles from './AnimalCard.module.css'

interface Props {
  animal: Animal
  onClick: () => void
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

function getAgeText(age: number): string {
  if (age < 1) return '幼年'
  if (age < 7) return '成年'
  return '老年'
}

export default function AnimalCard({ animal, onClick }: Props) {
  const SpeciesIcon = speciesIcons[animal.species] || Cat
  const bgColor = speciesColors[animal.species] || '#FFE0B2'

  return (
    <div className={`card ${styles.card}`} onClick={onClick}>
      <div
        className={styles.image}
        style={{ backgroundColor: bgColor }}
      >
        <SpeciesIcon size={64} color="#666" strokeWidth={1.2} />
        {animal.status === 'pending' && (
          <span className={styles.statusPending}>待审核</span>
        )}
        {animal.status === 'adopted' && (
          <span className={styles.statusAdopted}>已领养</span>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{animal.name}</h3>
          <Heart size={16} color="#F5A623" fill="none" />
        </div>

        <p className={styles.breed}>
          {animal.species} · {animal.breed} · {animal.age}岁({getAgeText(animal.age)})
        </p>

        <p className={styles.description}>{animal.description}</p>

        <div className={styles.tags}>
          {animal.personality.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
