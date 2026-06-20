import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import type { InstrumentType, AngleType, PartKey, PartPhoto, InspectionReport as IReport } from '../types';
import InspectionReport from '../components/InspectionReport';

const PART_LIST: { key: PartKey; name: string; desc: string; icon: string }[] = [
  { key: 'headstock', name: '琴头', desc: '请拍摄琴头正面，包含logo与调音旋钮', icon: '🎯' },
  { key: 'neck', name: '琴颈', desc: '请拍摄完整琴颈，品记与指板清晰可见', icon: '📏' },
  { key: 'body', name: '琴身', desc: '请拍摄完整琴身，音孔/拾音器清晰', icon: '🎸' },
  { key: 'bridge', name: '琴桥', desc: '请拍摄琴桥细节，弦距与固弦锥清晰', icon: '🌉' },
  { key: 'accessories', name: '配件', desc: '请拍摄琴包、背带、拨片等所有配件', icon: '🎒' },
];

const ANGLE_LIST: { value: AngleType; label: string; icon: string }[] = [
  { value: 'front', label: '正面', icon: '⬆️' },
  { value: 'back', label: '背面', icon: '⬇️' },
  { value: 'side', label: '侧面', icon: '↔️' },
  { value: 'top', label: '俯视', icon: '🔽' },
];

const TYPE_LIST: { value: InstrumentType; label: string; icon: string }[] = [
  { value: 'guitar', label: '吉他', icon: '🎸' },
  { value: 'violin', label: '小提琴', icon: '🎻' },
  { value: 'saxophone', label: '萨克斯', icon: '🎷' },
  { value: 'keyboard', label: '电子琴', icon: '🎹' },
];

const STEPS = [
  { id: 1, title: '选择乐器类型', desc: '告知我们你要验机的乐器' },
  { id: 2, title: '上传部位照片', desc: '按指引分部位上传清晰照片' },
  { id: 3, title: '生成验机报告', desc: '系统自动评估并生成报告' },
];

const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface PartUploadState {
  angle: AngleType;
  image: string | null;
  fileName: string | null;
}

type UploadState = Record<PartKey, PartUploadState>;

const initialUploadState: UploadState = {
  headstock: { angle: 'front', image: null, fileName: null },
  neck: { angle: 'front', image: null, fileName: null },
  body: { angle: 'front', image: null, fileName: null },
  bridge: { angle: 'top', image: null, fileName: null },
  accessories: { angle: 'front', image: null, fileName: null },
};

const ListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [instrumentType, setInstrumentType] = useState<InstrumentType | ''>('');
  const [uploads, setUploads] = useState<UploadState>(initialUploadState);
  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<IReport | null>(null);
  const fileInputRefs = useRef<Record<PartKey, HTMLInputElement | null>>({
    headstock: null,
    neck: null,
    body: null,
    bridge: null,
    accessories: null,
  });

  const allPartsUploaded = PART_LIST.every((p) => uploads[p.key].image !== null);

  const progress = (() => {
    if (step === 1) return instrumentType ? 33 : 10;
    if (step === 2) {
      const done = PART_LIST.filter((p) => uploads[p.key].image !== null).length;
      return 33 + (done / PART_LIST.length) * 34;
    }
    return 100;
  })();

  const handleFileSelect = async (part: PartKey, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await fileToDataURL(file);
      setUploads((prev) => ({
        ...prev,
        [part]: { ...prev[part], image: dataUrl, fileName: file.name },
      }));
    } catch {
      /* ignore */
    }
  };

  const handleAngleChange = (part: PartKey, angle: AngleType) => {
    setUploads((prev) => ({ ...prev, [part]: { ...prev[part], angle } }));
  };

  const handleRemovePhoto = (part: PartKey) => {
    setUploads((prev) => ({ ...prev, [part]: { ...prev[part], image: null, fileName: null } }));
  };

  const submitInspection = async () => {
    if (!instrumentType || !allPartsUploaded) return;
    setSubmitting(true);
    try {
      const photos: PartPhoto[] = PART_LIST.map((p) => ({
        part: p.key,
        angle: uploads[p.key].angle,
      }));
      const images = PART_LIST.reduce((acc, p) => {
        if (uploads[p.key].image) {
          acc[p.key] = uploads[p.key].image!;
        }
        return acc;
      }, {} as Record<PartKey, string>);

      const result = await api.submitInspection({
        instrument_type: instrumentType,
        photos,
        images,
      });
      setReport(result.report);
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && instrumentType) {
      setStep(2);
    } else if (step === 2 && allPartsUploaded) {
      submitInspection();
    }
  };

  const handlePrevStep = () => {
    if (step === 2) setStep(1);
  };

  const resetAll = () => {
    setStep(1);
    setInstrumentType('');
    setUploads(initialUploadState);
    setCurrentPartIdx(0);
    setReport(null);
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#2d2a26', marginBottom: 6 }}>🔬 发布验机申请</h1>
        <p style={{ fontSize: 14, color: '#8c7b6a' }}>按照标准化流程上传照片，系统自动生成权威验机报告，提升买家信任度</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 180 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    background: step >= s.id ? '#8B5E3C' : '#e8e0d6',
                    color: step >= s.id ? '#fff' : '#a89684',
                    transition: 'all 0.25s ease',
                    flexShrink: 0,
                  }}
                >
                  {step > s.id ? '✓' : s.id}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: step >= s.id ? '#2d2a26' : '#a89684', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#a89684', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.desc}
                  </div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 3, background: '#e8e0d6', borderRadius: 2, overflow: 'hidden', minWidth: 30 }}>
                  <div style={{ height: '100%', width: step > s.id ? '100%' : '0%', background: '#8B5E3C', transition: 'width 0.4s ease' }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <div className="progress-bar">
            <motion.div className="progress-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div style={{ fontSize: 12, color: '#8c7b6a', textAlign: 'right', marginTop: 6 }}>完成度：{Math.round(progress)}%</div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="card"
            style={{ padding: 28, marginBottom: 24 }}
          >
            <div className="section-title">
              <span>🎵</span>
              <span>选择乐器类型</span>
            </div>
            <p style={{ fontSize: 13, color: '#8c7b6a', marginBottom: 24 }}>不同乐器类型有不同的评分权重标准，请准确选择</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {TYPE_LIST.map((t, i) => (
                <motion.button
                  key={t.value}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setInstrumentType(t.value)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    border: instrumentType === t.value ? '2.5px solid #8B5E3C' : '2px solid transparent',
                    background: instrumentType === t.value ? 'rgba(139, 94, 60, 0.06)' : '#faf8f5',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: instrumentType === t.value ? '0 6px 20px rgba(139, 94, 60, 0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: instrumentType === t.value ? '#8B5E3C' : '#2d2a26' }}>
                    {t.label}
                  </div>
                </motion.button>
              ))}
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="wood-btn" onClick={handleNextStep} disabled={!instrumentType}>
                下一步：上传照片 →
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
              <div>
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>
                    <span>📋</span>
                    <span>部位清单</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PART_LIST.map((p, i) => {
                      const done = uploads[p.key].image !== null;
                      const active = currentPartIdx === i;
                      return (
                        <button
                          key={p.key}
                          onClick={() => setCurrentPartIdx(i)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: active ? '2px solid #8B5E3C' : '2px solid transparent',
                            background: active ? 'rgba(139, 94, 60, 0.06)' : done ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{p.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: '#a89684' }}>{done ? '✓ 已完成' : uploads[p.key].angle + ' / 待上传'}</div>
                          </div>
                          {done && <span style={{ color: '#22C55E', fontSize: 16 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ padding: 14, background: 'rgba(139, 94, 60, 0.06)', borderRadius: 12, fontSize: 12, color: '#5c554d', lineHeight: 1.7 }}>
                  💡 <strong>温馨提示：</strong><br />
                  请确保光线充足，对焦清晰<br />
                  所有5个部位均需上传后才可提交
                </div>
              </div>

              <div>
                <AnimatePresence mode="wait">
                  {(() => {
                    const current = PART_LIST[currentPartIdx];
                    const state = uploads[current.key];
                    return (
                      <motion.div
                        key={current.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="card"
                        style={{ padding: 24, marginBottom: 24 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                          <div style={{ fontSize: 40 }}>{current.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26', marginBottom: 4 }}>
                              第 {currentPartIdx + 1}/{PART_LIST.length} 步：{current.name}
                            </div>
                            <div style={{ fontSize: 13, color: '#8c7b6a' }}>{current.desc}</div>
                          </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                          <span className="label-text">拍摄角度</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {ANGLE_LIST.map((a) => {
                              const selected = state.angle === a.value;
                              return (
                                <button
                                  key={a.value}
                                  onClick={() => handleAngleChange(current.key, a.value)}
                                  style={{
                                    padding: '10px 6px',
                                    borderRadius: 10,
                                    border: selected ? '2px solid #8B5E3C' : '1.5px solid #e8e0d6',
                                    background: selected ? 'rgba(139, 94, 60, 0.06)' : '#faf8f5',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <div style={{ fontSize: 18, marginBottom: 2 }}>{a.icon}</div>
                                  <div style={{ fontSize: 12, fontWeight: selected ? 600 : 500, color: selected ? '#8B5E3C' : '#5c554d' }}>
                                    {a.label}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                          <span className="label-text">照片上传</span>
                          <input
                            ref={(el) => (fileInputRefs.current[current.key] = el)}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileSelect(current.key, e.target.files)}
                          />
                          {state.image ? (
                            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8e0d6' }}>
                              <img
                                src={state.image}
                                alt={current.name}
                                style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 10,
                                  right: 10,
                                  background: 'rgba(239, 68, 68, 0.9)',
                                  color: '#fff',
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 500,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(current.key);
                                }}
                              >
                                🗑️ 重新上传
                              </div>
                              <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11 }}>
                                {state.fileName} · {state.angle}面
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRefs.current[current.key]?.click()}
                              style={{
                                border: '2px dashed #d4c5b5',
                                borderRadius: 12,
                                padding: 50,
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: '#faf8f5',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLDivElement).style.borderColor = '#8B5E3C';
                                (e.currentTarget as HTMLDivElement).style.background = 'rgba(139, 94, 60, 0.03)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLDivElement).style.borderColor = '#d4c5b5';
                                (e.currentTarget as HTMLDivElement).style.background = '#faf8f5';
                              }}
                            >
                              <div style={{ fontSize: 48, marginBottom: 10, opacity: 0.5 }}>📷</div>
                              <div style={{ fontSize: 15, fontWeight: 600, color: '#5c554d', marginBottom: 4 }}>
                                点击选择或拖拽上传照片
                              </div>
                              <div style={{ fontSize: 12, color: '#a89684' }}>支持 JPG / PNG / WEBP，建议清晰大图</div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <button
                            className="wood-btn-outline"
                            onClick={() => setCurrentPartIdx(Math.max(0, currentPartIdx - 1))}
                            disabled={currentPartIdx === 0}
                            style={{ width: 120, height: 40, fontSize: 13 }}
                          >
                            ← 上一步
                          </button>
                          <button
                            className="wood-btn"
                            onClick={() => {
                              if (currentPartIdx < PART_LIST.length - 1) {
                                setCurrentPartIdx(currentPartIdx + 1);
                              }
                            }}
                            disabled={currentPartIdx === PART_LIST.length - 1 || !state.image}
                            style={{ width: 120, height: 40, fontSize: 13 }}
                          >
                            下一步 →
                          </button>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <button className="wood-btn-outline" onClick={handlePrevStep} style={{ width: 140 }}>
                    ← 返回选类型
                  </button>
                  <button
                    className="wood-btn"
                    onClick={handleNextStep}
                    disabled={!allPartsUploaded || submitting}
                    style={{ width: 220 }}
                  >
                    {submitting ? (
                      <>
                        <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        <span>生成报告中...</span>
                      </>
                    ) : (
                      `📊 生成验机报告 (${PART_LIST.filter((p) => uploads[p.key].image).length}/5)`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && report && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="card"
              style={{
                padding: 32,
                marginBottom: 24,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${report.grade_color}10, #ffffff)`,
              }}
            >
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#2d2a26', marginBottom: 6 }}>验机报告生成成功！</div>
              <div style={{ fontSize: 14, color: '#8c7b6a', marginBottom: 20 }}>
                报告ID：{report.id} · 可用于发布乐器或查看详情
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button className="wood-btn-outline" onClick={() => navigate(`/report/${report.id}`)} style={{ width: 160 }}>
                  📄 查看报告详情
                </button>
                <button className="wood-btn" onClick={resetAll} style={{ width: 160 }}>
                  🔄 再次验机
                </button>
              </div>
            </motion.div>

            <InspectionReport reportId={null} reportData={report} embedded />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListingPage;
