import React, { useState } from 'react'
import type { Animal } from '@/types'
import { AnimalIcon, speciesColors, speciesIconColors } from './AnimalIcon'
import { AdoptForm } from './AdoptForm'

interface AnimalListProps {
  animals: Animal[]
  loading: boolean
}

const cardImageHeights = [180, 220, 200, 240, 190, 210, 230, 170, 250, 200]

function getCardHeight(id: string, idx: number): number {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return cardImageHeights[(hash + idx) % cardImageHeights.length]
}

export const AnimalList: React.FC<AnimalListProps> = ({ animals, loading }) => {
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [showAdoptForm, setShowAdoptForm] = useState(false)

  if (loading) {
    return (
      <div className="animal-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animal-card" style={{ cursor: 'default' }}>
            <div className="skeleton" style={{ height: cardImageHeights[i % cardImageHeights.length], borderRadius: 0 }} />
            <div style={{ padding: 16 }}>
              <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 24, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!animals.length) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: '#666' }}>
        <p style={{ fontSize: 18 }}>暂无可领养的动物</p>
      </div>
    )
  }

  const closeDetail = () => setSelectedAnimal(null)
  const handleAdopt = () => setShowAdoptForm(true)

  return (
    <>
      <div className="animal-grid">
        {animals.map((animal, idx) => {
          const imgHeight = getCardHeight(animal.id, idx)
          return (
            <div
              key={animal.id}
              className="animal-card"
              onClick={() => setSelectedAnimal(animal)}
            >
              <div
                className="animal-image"
                style={{
                  background: speciesColors[animal.species],
                  height: `${imgHeight}px`
                }}
              >
                <div style={{ color: speciesIconColors[animal.species] }}>
                  <AnimalIcon species={animal.species} size={80} />
                </div>
                {animal.status === 'adopted' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: '#52C41A',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    已领养
                  </div>
                )}
              </div>
              <div className="animal-info">
                <div className="animal-name">{animal.name}</div>
                <div className="animal-meta">
                  {animal.breed} · {animal.age}岁
                </div>
                <div className="animal-tags">
                  {animal.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedAnimal && (
        <>
          <div className="detail-mask" onClick={closeDetail} />
          <AnimalDetail
            animal={selectedAnimal}
            onClose={closeDetail}
            onAdopt={handleAdopt}
          />
        </>
      )}

      {showAdoptForm && selectedAnimal && (
        <AdoptForm
          animal={selectedAnimal}
          onClose={() => {
            setShowAdoptForm(false)
          }}
        />
      )}
    </>
  )
}

interface AnimalDetailProps {
  animal: Animal
  onClose: () => void
  onAdopt: () => void
}

const AnimalDetail: React.FC<AnimalDetailProps> = ({ animal, onClose, onAdopt }) => {
  return (
    <div className="detail-panel">
      <button className="detail-close" onClick={onClose} aria-label="关闭">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div
        className="detail-header"
        style={{
          background: speciesColors[animal.species],
          height: '260px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: speciesIconColors[animal.species]
          }}
        >
          <AnimalIcon species={animal.species} size={140} />
        </div>
      </div>
      <div className="detail-body">
        <h2 className="detail-title">{animal.name}</h2>
        <div style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
          {animal.breed} · {animal.age}岁 · {animal.status === 'available' ? '可领养' : '已领养'}
        </div>
        <div className="animal-tags" style={{ marginBottom: 0 }}>
          {animal.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">动物简介</h3>
          <p className="detail-section-content">{animal.description}</p>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">动物故事</h3>
          <p className="detail-section-content">{animal.story}</p>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">健康状况</h3>
          <p className="detail-section-content">{animal.health}</p>
        </div>

        {animal.status === 'available' && (
          <div style={{ marginTop: 28, marginBottom: 8 }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onAdopt}>
              申请领养
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
