import { Heart, Pencil, Trash2 } from 'lucide-react';
import { useGradientStore } from '@/store/gradientStore';
import { generateGradientCSS } from '@/utils/cssGenerator';
import type { SavedScheme } from '@/types';
import styles from './FavoritesGrid.module.css';

export default function FavoritesGrid() {
  const savedSchemes = useGradientStore((s) => s.savedSchemes);
  const saveCurrentScheme = useGradientStore((s) => s.saveCurrentScheme);
  const deleteScheme = useGradientStore((s) => s.deleteScheme);
  const loadScheme = useGradientStore((s) => s.loadScheme);
  const currentScheme = useGradientStore((s) => s.currentScheme);

  const handleSave = () => {
    saveCurrentScheme();
  };

  const handleEdit = (scheme: SavedScheme) => {
    loadScheme(scheme);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除该方案吗？')) {
      deleteScheme(id);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>我的收藏夹</h3>
        <button className={styles.saveBtn} onClick={handleSave}>
          <Heart size={14} /> 保存当前方案
        </button>
      </div>

      {savedSchemes.length === 0 ? (
        <div className={styles.empty}>
          还没有收藏的方案，点击上方"保存当前方案"来收藏「{currentScheme.name}」
        </div>
      ) : (
        <div className={styles.grid}>
          {savedSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className={styles.card}
              style={{
                background: generateGradientCSS(
                  scheme.colorStops,
                  scheme.gradientType,
                  scheme.angle
                ),
              }}
              onClick={() => handleEdit(scheme)}
            >
              <div className={styles.cardOverlay}>
                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(scheme);
                  }}
                  title="编辑"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={(e) => handleDelete(scheme.id, e)}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <span className={styles.cardName}>{scheme.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
