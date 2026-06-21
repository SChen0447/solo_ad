import { useAppStore } from '@/store/useAppStore';
import { ANIMATION_CONFIGS } from '@/types';
import styles from './ActionLabel.module.css';

const ActionLabel = () => {
  const { currentAction } = useAppStore();

  if (currentAction === 'idle') return null;

  const config = ANIMATION_CONFIGS.find((c) => c.name === currentAction);

  if (!config) return null;

  return (
    <div className={styles.label}>
      {config.label}
    </div>
  );
};

export default ActionLabel;
