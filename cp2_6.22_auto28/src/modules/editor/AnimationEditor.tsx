import styled from 'styled-components'
import type { AnimationConfig, AnimationInstance, AnimationType } from '@/types/animation'
import { ANIMATION_TYPE_LABELS } from '@/types/animation'
import { AnimationCard } from './AnimationCard'

const EditorContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`

const EditorTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
`

const AddButton = styled.button`
  background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
  color: #FFFFFF;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const InstancesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const InstanceTabs = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
`

const InstanceTab = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => $active ? '#8B5CF6' : '#E5E7EB'};
  background: ${({ $active }) => $active ? 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)' : '#F9FAFB'};
  color: ${({ $active }) => $active ? '#8B5CF6' : '#6B7280'};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ $active }) => $active ? '#8B5CF6' : '#D1D5DB'};
  }
`

interface AnimationEditorProps {
  instances: AnimationInstance[]
  onUpdateConfig: (instanceId: string, config: AnimationConfig) => void
  onAddInstance: () => void
  onRemoveInstance: (instanceId: string) => void
}

export function AnimationEditor({
  instances,
  onUpdateConfig,
  onAddInstance,
  onRemoveInstance
}: AnimationEditorProps) {
  return (
    <EditorContainer>
      <EditorHeader>
        <EditorTitle>动画参数</EditorTitle>
        <AddButton
          onClick={onAddInstance}
          disabled={instances.length >= 4}
        >
          + 添加实例 ({instances.length}/4)
        </AddButton>
      </EditorHeader>

      <InstancesList>
        {instances.map((instance, idx) => (
          <AnimationCard
            key={instance.id}
            index={idx}
            instance={instance}
            onUpdate={(config) => onUpdateConfig(instance.id, config)}
            onRemove={() => onRemoveInstance(instance.id)}
            canRemove={instances.length > 1}
          />
        ))}
      </InstancesList>
    </EditorContainer>
  )
}
