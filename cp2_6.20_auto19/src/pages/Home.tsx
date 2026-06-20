import { useEffect } from 'react'
import { useAppStore } from '@/store'
import type { Animal } from '@/types'
import AnnouncementBar from '@/components/AnnouncementBar'
import AnimalList from '@/components/AnimalList'
import AnimalDetail from '@/components/AnimalDetail'
import AdoptForm from '@/components/AdoptForm'
import styles from './Home.module.css'

export default function Home() {
  const animals = useAppStore((s) => s.animals)
  const selectedAnimal = useAppStore((s) => s.selectedAnimal)
  const showAdoptForm = useAppStore((s) => s.showAdoptForm)
  const loading = useAppStore((s) => s.loading)
  const fetchAnimals = useAppStore((s) => s.fetchAnimals)
  const fetchAnnouncements = useAppStore((s) => s.fetchAnnouncements)
  const setSelectedAnimal = useAppStore((s) => s.setSelectedAnimal)
  const setShowAdoptForm = useAppStore((s) => s.setShowAdoptForm)
  const setLoading = useAppStore((s) => s.setLoading)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchAnimals(), fetchAnnouncements()])
      setLoading(false)
    }
    load()
  }, [fetchAnimals, fetchAnnouncements, setLoading])

  const handleSelectAnimal = (animal: Animal) => {
    setSelectedAnimal(animal)
  }

  const handleCloseDetail = () => {
    setSelectedAnimal(null)
  }

  const handleAdopt = () => {
    if (selectedAnimal && selectedAnimal.status === 'available') {
      setShowAdoptForm(true)
    }
  }

  const handleCloseForm = () => {
    setShowAdoptForm(false)
  }

  return (
    <div className={`page-fade-enter ${styles.wrapper}`}>
      <AnnouncementBar />

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            找一个
            <span className={styles.heroHighlight}>毛茸茸</span>
            的家人
          </h1>
          <p className={styles.heroSubtitle}>
            {animals.length > 0
              ? `目前有 ${animals.filter((a) => a.status === 'available').length} 只可爱的小动物正在等待温暖的家`
              : '加载中...'}
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <AnimalList
          animals={animals}
          onSelectAnimal={handleSelectAnimal}
          loading={loading}
        />
      </div>

      <AnimalDetail
        animal={selectedAnimal}
        onClose={handleCloseDetail}
        onAdopt={handleAdopt}
      />

      <AdoptForm
        animal={showAdoptForm ? selectedAnimal : null}
        onClose={handleCloseForm}
      />
    </div>
  )
}
