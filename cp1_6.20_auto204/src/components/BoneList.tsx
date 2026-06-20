import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bones, boneGroups, getBonesByGroup, BoneData } from '@/utils/boneData';

interface BoneListProps {
  selectedBone: string | null;
  onBoneSelect: (boneId: string) => void;
  isMobile?: boolean;
}

const BoneList = ({ selectedBone, onBoneSelect, isMobile = false }: BoneListProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    head: true,
    torso: true,
    forelimb: true,
    hindlimb: true,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedBone && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedBone]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'head':
        return '💀';
      case 'torso':
        return '🦴';
      case 'forelimb':
        return '🦾';
      case 'hindlimb':
        return '🦿';
      default:
        return '🦴';
    }
  };

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'rgba(10, 10, 20, 0.9)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          zIndex: 900,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
          {bones.map((bone) => (
            <button
              key={bone.id}
              onClick={() => onBoneSelect(bone.id)}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedBone === bone.id ? '#FFA07A' : 'rgba(255, 255, 255, 0.1)',
                background: selectedBone === bone.id ? 'rgba(255, 160, 122, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedBone === bone.id ? '#FFA07A' : '#E0D8C6',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: "'Times New Roman', Georgia, serif",
                transition: 'all 0.3s ease-in-out',
              }}
            >
              {bone.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: '20px',
        bottom: '20px',
        width: '240px',
        maxHeight: '50vh',
        background: 'rgba(10, 10, 20, 0.7)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        zIndex: 900,
        fontFamily: "'Times New Roman', Georgia, serif",
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#F0E6D3',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🦴</span>
          骨骼列表
        </h3>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: '#888',
          }}
        >
          共 {bones.length} 块骨骼
        </p>
      </div>

      <div
        ref={listRef}
        style={{
          maxHeight: 'calc(50vh - 60px)',
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {Object.entries(boneGroups).map(([groupKey, groupInfo]) => {
          const groupBones = getBonesByGroup(groupKey);
          const isExpanded = expandedGroups[groupKey];

          return (
            <div key={groupKey} style={{ marginBottom: '4px' }}>
              <button
                onClick={() => toggleGroup(groupKey)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#E0D8C6',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  textAlign: 'left',
                  transition: 'background 0.3s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '14px' }}>{getGroupIcon(groupKey)}</span>
                <span style={{ flex: 1 }}>{groupInfo.name}</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {groupBones.length}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    transition: 'transform 0.3s ease-in-out',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                >
                  ▶
                </span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    {groupBones.map((bone) => (
                      <div
                        key={bone.id}
                        ref={selectedBone === bone.id ? selectedRef : null}
                        onClick={() => onBoneSelect(bone.id)}
                        style={{
                          padding: '7px 12px 7px 32px',
                          margin: '2px 0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: selectedBone === bone.id ? '#FFA07A' : '#C0B8A8',
                          background: selectedBone === bone.id
                            ? 'rgba(255, 160, 122, 0.15)'
                            : 'transparent',
                          border: selectedBone === bone.id
                            ? '1px solid rgba(255, 160, 122, 0.3)'
                            : '1px solid transparent',
                          transition: 'all 0.3s ease-in-out',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedBone !== bone.id) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.color = '#E0D8C6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedBone !== bone.id) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#C0B8A8';
                          }
                        }}
                      >
                        {bone.name}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default BoneList;
