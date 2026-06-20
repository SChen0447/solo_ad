import { useState, useMemo } from 'react'
import { Search, Filter, X, PawPrint } from 'lucide-react'
import type { Animal } from '@/types'
import AnimalCard from './AnimalCard'
import styles from './AnimalList.module.css'

interface Props {
  animals: Animal[]
  onSelectAnimal: (animal: Animal) => void
  loading?: boolean
}

type SpeciesFilter = 'all' | '猫' | '狗' | '其他'
type AgeFilter = 'all' | '幼年' | '成年' | '老年'
type PersonalityFilter = 'all' | '温顺' | '活泼' | '独立'

const speciesOptions: { value: SpeciesFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '猫', label: '猫' },
  { value: '狗', label: '狗' },
  { value: '其他', label: '其他' },
]

const ageOptions: { value: AgeFilter; label: string }[] = [
  { value: 'all', label: '全部年龄' },
  { value: '幼年', label: '幼年（<1岁）' },
  { value: '成年', label: '成年（1-6岁）' },
  { value: '老年', label: '老年（≥7岁）' },
]

const personalityOptions: { value: PersonalityFilter; label: string }[] = [
  { value: 'all', label: '全部性格' },
  { value: '温顺', label: '温顺' },
  { value: '活泼', label: '活泼' },
  { value: '独立', label: '独立' },
]

function getAgeCategory(age: number): AgeFilter {
  if (age < 1) return '幼年'
  if (age < 7) return '成年'
  return '老年'
}

function hasPersonality(animal: Animal, filter: PersonalityFilter): boolean {
  if (filter === 'all') return true
  const map: Record<Exclude<PersonalityFilter, 'all'>, string[]> = {
    '温顺': ['温顺', '温柔', '安静', '亲人', '温和', '耐心', '粘人'],
    '活泼': ['活泼', '调皮', '贪玩', '好奇', '聪明', '精力充沛'],
    '独立': ['独立', '勇敢', '忠诚', '慵懒', '稳重', '胆小', '优雅', '贪吃', '可爱', '友善'],
  }
  return animal.personality.some((p) => map[filter]?.includes(p))
}

export default function AnimalList({ animals, onSelectAnimal, loading }: Props) {
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState<SpeciesFilter>('all')
  const [age, setAge] = useState<AgeFilter>('all')
  const [personality, setPersonality] = useState<PersonalityFilter>('all')

  const filteredAnimals = useMemo(() => {
    return animals.filter((animal) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!animal.name.toLowerCase().includes(q)) return false
      }
      if (species !== 'all') {
        if (species === '其他') {
          if (['猫', '狗'].includes(animal.species)) return false
        } else if (animal.species !== species) {
          return false
        }
      }
      if (age !== 'all' && getAgeCategory(animal.age) !== age) return false
      if (!hasPersonality(animal, personality)) return false
      return true
    })
  }, [animals, search, species, age, personality])

  const hasActiveFilter = search !== '' || species !== 'all' || age !== 'all' || personality !== 'all'

  const resetFilters = () => {
    setSearch('')
    setSpecies('all')
    setAge('all')
    setPersonality('all')
  }

  return (
    <div className={styles.wrapper}>
      <div className={`card ${styles.filterBar}`}>
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="搜索动物名字..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            {search && (
              <button
                className={styles.clearBtn}
                onClick={() => setSearch('')}
                aria-label="清除搜索"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {hasActiveFilter && (
            <button className={styles.resetBtn} onClick={resetFilters}>
              <X size={16} />
              重置
            </button>
          )}
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>
              <Filter size={14} />
              品种
            </div>
            <div className={styles.chipGroup}>
              {speciesOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.chip} ${species === opt.value ? styles.chipActive : ''}`}
                  onClick={() => setSpecies(opt.value === species ? 'all' : opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>
              <Filter size={14} />
              年龄
            </div>
            <div className={styles.chipGroup}>
              {ageOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.chip} ${age === opt.value ? styles.chipActive : ''}`}
                  onClick={() => setAge(opt.value === age ? 'all' : opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>
              <Filter size={14} />
              性格
            </div>
            <div className={styles.chipGroup}>
              {personalityOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.chip} ${personality === opt.value ? styles.chipActive : ''}`}
                  onClick={() => setPersonality(opt.value === personality ? 'all' : opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {hasActiveFilter && (
        <div className={styles.resultInfo}>
          共找到 <strong>{filteredAnimals.length}</strong> 只符合条件的动物
        </div>
      )}

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.skeletonCard} skeleton`}>
              <div className={styles.skeletonImg} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} style={{ width: '50%' }} />
                <div className={styles.skeletonLine} style={{ width: '80%' }} />
                <div className={styles.skeletonLine} style={{ width: '60%' }} />
                <div className={styles.skeletonTags}>
                  <div className={styles.skeletonTag} />
                  <div className={styles.skeletonTag} />
                  <div className={styles.skeletonTag} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAnimals.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <PawPrint size={48} color="#D4C4B0" />
          <h3 className={styles.emptyTitle}>
            {animals.length === 0 ? '暂无动物信息' : '没有找到符合条件的动物'}
          </h3>
          <p className={styles.emptyDesc}>
            {animals.length === 0
              ? '请稍后再来查看，可能很快就有新的小动物等待领养哦'
              : '试试调整筛选条件吧'}
          </p>
          {hasActiveFilter && (
            <button className="btn-primary" onClick={resetFilters}>
              清除筛选条件
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredAnimals.map((animal) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              onClick={() => onSelectAnimal(animal)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
