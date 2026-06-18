import { useState, useRef, useCallback } from 'react';
import { usePetStore } from '../store/petStore';
import PetCard from '../components/PetCard';
import AdoptModal from '../components/AdoptModal';

function HeartParticles({ x, y }: { x: number; y: number }) {
  const hearts = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    offsetX: (Math.random() - 0.5) * 120,
    offsetY: (Math.random() - 0.5) * 80,
    delay: Math.random() * 0.3,
  }));

  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 100 }}>
      {hearts.map((h) => (
        <span
          key={h.id}
          className="heart-particle"
          style={{
            left: h.offsetX,
            top: h.offsetY,
            animationDelay: `${h.delay}s`,
          }}
        >
          💕
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const { pets, createPet, interactPets } = usePetStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [newPetId, setNewPetId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const particleCounter = useRef(0);

  const handleAdopt = useCallback(async (name: string, species: 'cat' | 'dog' | 'rabbit') => {
    await createPet(name, species);
    const currentPets = usePetStore.getState().pets;
    const newest = currentPets[currentPets.length - 1];
    if (newest) {
      setNewPetId(newest.id);
      setTimeout(() => setNewPetId(null), 600);
    }
  }, [createPet]);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDragOverId(null);
      setDraggingId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const id = particleCounter.current++;
    setParticles((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 1500);

    interactPets(sourceId, targetId);
    setDragOverId(null);
    setDraggingId(null);
  }, [interactPets]);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        marginTop: '40px',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#4a3728' }}>
          🏠 我的宠物家园
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '10px 24px',
            background: '#f5a623',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(245,166,35,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e6971a';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f5a623';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          + 领养新宠物
        </button>
      </div>

      {pets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#999',
          fontSize: '16px',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🐾</div>
          <p>还没有宠物，快去领养一只吧！</p>
        </div>
      ) : (
        <div
          className="pet-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          {pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              isNew={pet.id === newPetId}
              onDragStart={(e, petId) => {
                e.dataTransfer.setData('text/plain', petId);
                setDraggingId(petId);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingId !== pet.id) {
                  setDragOverId(pet.id);
                }
              }}
              onDrop={(e, petId) => handleDrop(e, petId)}
              isDragOver={dragOverId === pet.id}
              isDragging={draggingId === pet.id}
            />
          ))}
        </div>
      )}

      {particles.map((p) => (
        <HeartParticles key={p.id} x={p.x} y={p.y} />
      ))}

      <AdoptModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdopt={handleAdopt}
      />
    </div>
  );
}
