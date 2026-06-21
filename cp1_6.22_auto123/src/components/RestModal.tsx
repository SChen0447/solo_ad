import { useAppStore } from '@/store/useAppStore';
import { ANIMATION_CONFIGS } from '@/types';
import styles from './RestModal.module.css';

const RestModal = () => {
  const { showRestModal, currentAction, setCurrentAction, startRestPhase, timer } = useAppStore();

  if (!showRestModal) return null;

  const currentConfig = ANIMATION_CONFIGS.find((c) => c.name === currentAction);

  const handleNextAction = () => {
    const actions = ANIMATION_CONFIGS.map((c) => c.name);
    const currentIndex = actions.indexOf(currentAction);
    const nextIndex = currentIndex + 1;

    if (nextIndex < actions.length) {
      setCurrentAction(actions[nextIndex]);
    } else {
      startRestPhase();
    }
  };

  const handleSkip = () => {
    startRestPhase();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.icon}>🧘</div>
          <h2 className={styles.title}>时间到！休息一下吧</h2>
          <p className={styles.subtitle}>已经专注了25分钟，来做个简单的拉伸运动</p>

          {currentConfig && (
            <div className={styles.actionCard}>
              <h3 className={styles.actionName}>{currentConfig.label}</h3>
              <p className={styles.actionDesc}>{currentConfig.description}</p>
              <p className={styles.actionDuration}>持续 {currentConfig.duration} 秒</p>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.skipButton} onClick={handleSkip}>
              跳过休息
            </button>
            <button className={styles.nextButton} onClick={handleNextAction}>
              {ANIMATION_CONFIGS.findIndex((c) => c.name === currentAction) < ANIMATION_CONFIGS.length - 1
                ? '下一个动作'
                : '开始休息'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestModal;
