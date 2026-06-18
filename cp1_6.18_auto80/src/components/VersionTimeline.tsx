import { useMemo, type FC } from 'react';
import type { VersionRecord } from '../types';
import { StatusBadge } from './StatusBadge';
import styles from './VersionTimeline.module.css';

interface Props {
  versions: VersionRecord[];
  selectedVersionId?: string | null;
  loading?: boolean;
  onSelect: (v: VersionRecord) => void;
}

const formatTime = (iso?: string) => {
  if (!iso) return '--';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
};

export const VersionTimeline: FC<Props> = ({
  versions,
  selectedVersionId,
  loading,
  onSelect,
}) => {
  const skeleton = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => (
        <li key={`sk-${i}`} className={styles.item}>
          <div className={styles.dot} />
          <div className={styles.skeletonContent}>
            <div className={styles.skRow1}>
              <div className={styles.skTitle} />
              <div className={styles.skBadge} />
            </div>
            <div className={styles.skRow2} />
            <div className={styles.skRow3} />
          </div>
        </li>
      )),
    []
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>版本历史</span>
        <span className={styles.count}>共 {versions.length} 个版本</span>
      </div>
      <ul className={styles.list}>
        {loading ? (
          skeleton
        ) : versions.length === 0 ? (
          <li className={styles.empty}>暂无版本记录</li>
        ) : (
          versions.map((v) => {
            const active = v.id === selectedVersionId;
            const hasSignature = v.signatureA || v.signatureB;
            return (
              <li
                key={v.id}
                className={`${styles.item} ${active ? styles.active : ''}`}
                onClick={() => onSelect(v)}
              >
                <div className={`${styles.dot} ${active ? styles.dotActive : ''}`}>
                  {hasSignature && <span className={styles.dotInner} />}
                </div>
                <div className={styles.content}>
                  <div className={styles.row1}>
                    <span className={styles.version}>
                      V{v.versionNumber.toString().padStart(2, '0')}
                    </span>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className={styles.row2}>
                    {v.signerA || v.signerB ? (
                      <>
                        <span>{v.signerA || '甲方未签'}</span>
                        <span className={styles.vs}>↔</span>
                        <span>{v.signerB || '乙方未签'}</span>
                      </>
                    ) : (
                      <span className={styles.unsigned}>尚未签署</span>
                    )}
                  </div>
                  <div className={styles.row3}>
                    <span>{formatTime(v.signedAt || v.createdAt)}</span>
                    {active && <span className={styles.currentTag}>当前预览</span>}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default VersionTimeline;
