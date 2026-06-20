import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import type { ProcessPhoto } from '../api'
import { saveRecord } from '../api'

const timeOptions = ['1-2小时', '半天', '一天', '两天', '一周']

interface RecordStep1 {
  goal: string
  estimatedTime: string
  tools: string[]
}

interface RecordStep2 {
  processPhotos: ProcessPhoto[]
}

interface RecordStep3 {
  finalImages: string[]
  reflection: string
}

const RecordPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const inspiration = (location.state as any)?.inspiration
  const category = (location.state as any)?.category || '塑料瓶'

  const [currentStep, setCurrentStep] = useState(1)
  const [published, setPublished] = useState(false)

  const [step1, setStep1] = useState<RecordStep1>({
    goal: '',
    estimatedTime: '',
    tools: [],
  })
  const [step2, setStep2] = useState<RecordStep2>({
    processPhotos: [],
  })
  const [step3, setStep3] = useState<RecordStep3>({
    finalImages: [],
    reflection: '',
  })

  const [toolInput, setToolInput] = useState('')
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const processFileRef = useRef<HTMLInputElement>(null)
  const finalFileRef = useRef<HTMLInputElement>(null)

  const addTool = () => {
    if (toolInput.trim() && step1.tools.length < 20) {
      setStep1({ ...step1, tools: [...step1.tools, toolInput.trim()] })
      setToolInput('')
    }
  }

  const removeTool = (index: number) => {
    setStep1({
      ...step1,
      tools: step1.tools.filter((_, i) => i !== index),
    })
  }

  const handleProcessPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 5 - step2.processPhotos.length

    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const url = ev.target?.result as string
        setStep2((prev) => ({
          ...prev,
          processPhotos: [
            ...prev.processPhotos,
            { url, description: '' },
          ],
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const updatePhotoDesc = (index: number, desc: string) => {
    const newPhotos = [...step2.processPhotos]
    newPhotos[index] = { ...newPhotos[index], description: desc }
    setStep2({ ...step2, processPhotos: newPhotos })
  }

  const removePhoto = (index: number) => {
    setStep2({
      ...step2,
      processPhotos: step2.processPhotos.filter((_, i) => i !== index),
    })
  }

  const handleFinalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 3 - step3.finalImages.length

    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const url = ev.target?.result as string
        setStep3((prev) => ({
          ...prev,
          finalImages: [...prev.finalImages, url],
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFinalImage = (index: number) => {
    setStep3({
      ...step3,
      finalImages: step3.finalImages.filter((_, i) => i !== index),
    })
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return step1.goal.trim().length > 0 && step1.estimatedTime && step1.tools.length > 0
    }
    if (currentStep === 2) {
      return step2.processPhotos.length > 0
    }
    if (currentStep === 3) {
      return (
        step3.finalImages.length > 0 &&
        step3.reflection.trim().length >= 200 &&
        step3.reflection.trim().length <= 500
      )
    }
    return false
  }

  const handleSubmit = async () => {
    try {
      await saveRecord({
        userId: 'demo-user',
        inspirationId: id || '',
        category,
        steps: {
          goal: step1.goal,
          estimatedTime: step1.estimatedTime,
          tools: step1.tools,
          processPhotos: step2.processPhotos,
          finalImages: step3.finalImages,
          reflection: step3.reflection,
        },
      })
      setPublished(true)
    } catch (err) {
      console.error('发布失败:', err)
      alert('发布失败，请重试')
    }
  }

  const stepColors = ['#4ECDC4', '#69C2A8', '#84B88C', '#9FAE70', '#B9A454', '#D49A38', '#F39C12']
  const getStepColor = (i: number) => stepColors[i % stepColors.length]

  if (published) {
    const timeline = [
      { title: '制定改造计划', detail: step1.goal, sub: `耗时: ${step1.estimatedTime}` },
      { title: '准备工具', detail: step1.tools.join('、'), sub: `${step1.tools.length} 件工具` },
      ...step2.processPhotos.map((p, i) => ({
        title: `改造步骤 ${i + 1}`,
        detail: p.description || '过程记录',
        image: p.url,
      })),
      { title: '改造完成', detail: step3.reflection, images: step3.finalImages },
    ]

    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 16, fontSize: 28 }}>
          改造历程时间线
        </h2>
        <p style={{ textAlign: 'center', color: '#7A5C3F', marginBottom: 40 }}>
          恭喜您完成了一次精彩的旧物改造！
        </p>

        <div style={{ position: 'relative', paddingLeft: 60 }}>
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: 0,
              bottom: 0,
              width: 2,
              borderLeft: '2px dashed #D4A373',
            }}
          />
          {timeline.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              style={{ position: 'relative', marginBottom: 32 }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -52,
                  top: 0,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: getStepColor(index),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {index + 1}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#999999',
                  marginBottom: 6,
                  position: 'absolute',
                  left: -180,
                  top: 10,
                  width: 120,
                  textAlign: 'right',
                  display: 'none',
                }}
              >
                2024.01.{10 + index}
              </div>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                }}
              >
                <h4 style={{ fontSize: 16, color: '#4A3728', marginBottom: 8 }}>
                  {item.title}
                </h4>
                {(item as any).sub && (
                  <p style={{ fontSize: 12, color: '#999999', marginBottom: 8 }}>
                    {(item as any).sub}
                  </p>
                )}
                <p style={{ fontSize: 14, color: '#5D4E37', lineHeight: 1.6 }}>
                  {item.detail}
                </p>
                {(item as any).image && (
                  <img
                    src={(item as any).image}
                    alt=""
                    style={{
                      width: 200,
                      height: 112,
                      objectFit: 'cover',
                      borderRadius: 8,
                      marginTop: 12,
                      cursor: 'pointer',
                    }}
                    onClick={() => setViewerImage((item as any).image)}
                  />
                )}
                {(item as any).images && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    {(item as any).images.map((img: string, i: number) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        style={{
                          width: 180,
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                        onClick={() => setViewerImage(img)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            onClick={() => navigate('/profile')}
            style={{
              backgroundColor: '#D4A373',
              color: '#FFFFFF',
              padding: '12px 40px',
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 500,
              marginRight: 16,
            }}
          >
            查看我的改造记录
          </button>
          <button
            onClick={() => navigate('/gallery')}
            style={{
              backgroundColor: '#ECF0F1',
              color: '#555555',
              padding: '12px 40px',
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            继续浏览灵感
          </button>
        </div>

        <AnimatePresence>
          {viewerImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewerImage(null)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 40,
              }}
            >
              <img
                src={viewerImage}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: 28 }}>
        创建改造计划
      </h2>
      {inspiration && (
        <p style={{ textAlign: 'center', color: '#7A5C3F', marginBottom: 32 }}>
          基于灵感：<strong style={{ color: '#4A3728' }}>{inspiration.title}</strong>
        </p>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 40,
        }}
      >
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor:
                  step <= currentStep ? '#D4A373' : '#ECF0F1',
                color: step <= currentStep ? '#FFFFFF' : '#999999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.3s ease',
              }}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                style={{
                  width: 40,
                  height: 2,
                  alignSelf: 'center',
                  backgroundColor: step < currentStep ? '#D4A373' : '#ECF0F1',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#4A3728' }}>
                改造目标 <span style={{ color: '#E74C3C' }}>*</span>
              </label>
              <textarea
                value={step1.goal}
                onChange={(e) => setStep1({ ...step1, goal: e.target.value.slice(0, 200) })}
                placeholder="描述你想把这个物品改造成什么..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  border: '1px solid #E0D5C8',
                  borderRadius: 8,
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: 12, color: '#999999', marginTop: 4 }}>
                {step1.goal.length}/200
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#4A3728' }}>
                预估耗时 <span style={{ color: '#E74C3C' }}>*</span>
              </label>
              <select
                value={step1.estimatedTime}
                onChange={(e) => setStep1({ ...step1, estimatedTime: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #E0D5C8',
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">请选择预估耗时</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#4A3728' }}>
                所需工具 <span style={{ color: '#E74C3C' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={toolInput}
                  onChange={(e) => setToolInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                  placeholder="输入工具名称后按回车"
                  style={{
                    flex: 1,
                    padding: 12,
                    border: '1px solid #E0D5C8',
                    borderRadius: 8,
                    fontSize: 14,
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={addTool}
                  style={{
                    padding: '0 20px',
                    backgroundColor: '#D4A373',
                    color: '#FFFFFF',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  添加
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {step1.tools.map((tool, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      backgroundColor: '#F8F9FA',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#5D4E37',
                    }}
                  >
                    {tool}
                    <button
                      onClick={() => removeTool(i)}
                      style={{
                        background: 'none',
                        color: '#999999',
                        fontSize: 14,
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#4A3728' }}>
                上传改造过程照片 <span style={{ color: '#E74C3C' }}>*</span>
                <span style={{ color: '#999999', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                  （最多5张）
                </span>
              </label>
              <input
                ref={processFileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleProcessPhotoUpload}
                style={{ display: 'none' }}
              />
              {step2.processPhotos.length < 5 && (
                <button
                  onClick={() => processFileRef.current?.click()}
                  style={{
                    width: 200,
                    height: 112,
                    border: '2px dashed #D4A373',
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    color: '#D4A373',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <i className="fas fa-plus" style={{ fontSize: 24 }} />
                  <span>添加照片</span>
                </button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {step2.processPhotos.map((photo, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'flex-start',
                      backgroundColor: '#FFFFFF',
                      padding: 12,
                      borderRadius: 12,
                    }}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      style={{
                        width: 200,
                        height: 112,
                        objectFit: 'cover',
                        borderRadius: 8,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onClick={() => setViewerImage(photo.url)}
                    />
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={photo.description}
                        onChange={(e) => updatePhotoDesc(i, e.target.value)}
                        placeholder="为这张照片添加说明..."
                        style={{
                          width: '100%',
                          minHeight: 80,
                          padding: 10,
                          border: '1px solid #E0D5C8',
                          borderRadius: 8,
                          fontSize: 13,
                          resize: 'none',
                          fontFamily: 'inherit',
                          outline: 'none',
                          marginBottom: 8,
                        }}
                      />
                      <button
                        onClick={() => removePhoto(i)}
                        style={{
                          fontSize: 12,
                          color: '#E74C3C',
                          background: 'none',
                          padding: 0,
                        }}
                      >
                        删除此照片
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#4A3728' }}>
                上传最终成品图 <span style={{ color: '#E74C3C' }}>*</span>
                <span style={{ color: '#999999', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                  （最多3张）
                </span>
              </label>
              <input
                ref={finalFileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFinalImageUpload}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {step3.finalImages.map((img, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ position: 'relative' }}
                  >
                    <img
                      src={img}
                      alt=""
                      style={{
                        width: 180,
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                      onClick={() => setViewerImage(img)}
                    />
                    <button
                      onClick={() => removeFinalImage(i)}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#E74C3C',
                        color: '#FFFFFF',
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
                {step3.finalImages.length < 3 && (
                  <button
                    onClick={() => finalFileRef.current?.click()}
                    style={{
                      width: 180,
                      height: 120,
                      border: '2px dashed #D4A373',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      color: '#D4A373',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <i className="fas fa-plus" style={{ fontSize: 20 }} />
                    <span>添加成品图</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#4A3728' }}>
                改造心得 <span style={{ color: '#E74C3C' }}>*</span>
                <span style={{ color: '#999999', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                  （200-500字）
                </span>
              </label>
              <textarea
                value={step3.reflection}
                onChange={(e) => setStep3({ ...step3, reflection: e.target.value.slice(0, 500) })}
                placeholder="分享一下你的改造心得、遇到的困难和收获..."
                style={{
                  width: '100%',
                  minHeight: 160,
                  padding: 12,
                  border: '1px solid #E0D5C8',
                  borderRadius: 8,
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              />
              <div
                style={{
                  textAlign: 'right',
                  fontSize: 12,
                  color: step3.reflection.length >= 200 ? '#6B8E23' : '#E74C3C',
                  marginTop: 4,
                }}
              >
                {step3.reflection.length}/500 {step3.reflection.length < 200 && '（至少200字）'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid #F0E6D8',
        }}
      >
        <button
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
          style={{
            padding: '10px 28px',
            borderRadius: 20,
            fontSize: 14,
            backgroundColor: currentStep === 1 ? '#F0E6D8' : '#ECF0F1',
            color: currentStep === 1 ? '#B8A99A' : '#555555',
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          上一步
        </button>
        {currentStep < 3 ? (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
            style={{
              padding: '10px 32px',
              borderRadius: 20,
              fontSize: 14,
              backgroundColor: canProceed() ? '#D4A373' : '#F0E6D8',
              color: canProceed() ? '#FFFFFF' : '#B8A99A',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              fontWeight: 500,
            }}
          >
            下一步
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed()}
            style={{
              padding: '10px 32px',
              borderRadius: 20,
              fontSize: 14,
              backgroundColor: canProceed() ? '#D4A373' : '#F0E6D8',
              color: canProceed() ? '#FFFFFF' : '#B8A99A',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              fontWeight: 500,
            }}
          >
            发布改造
          </button>
        )}
      </div>

      <AnimatePresence>
        {viewerImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewerImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 40,
            }}
          >
            <img
              src={viewerImage}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RecordPage
