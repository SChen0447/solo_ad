import { useState, useRef, useEffect } from 'react'
import { api } from '../utils/api'
import '../styles/NoteInput.css'

type InputMode = 'text' | 'voice' | 'image'

interface NoteInputProps {
  onNoteCreated: () => void
}

interface SaveFeedback {
  show: boolean
  success: boolean
}

function NoteInput({ onNoteCreated }: NoteInputProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [textContent, setTextContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [location, setLocation] = useState<string | undefined>(undefined)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>({ show: false, success: true })

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [waveformData, setWaveformData] = useState<number[]>(new Array(40).fill(3))
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const recordingTimerRef = useRef<number | null>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageDescription, setImageDescription] = useState('')

  useEffect(() => {
    getCurrentLocation()
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const loc = await api.getLocationName(position.coords.latitude, position.coords.longitude)
          setLocation(loc || undefined)
        } catch {
          setLocation(undefined)
        } finally {
          setGettingLocation(false)
        }
      },
      () => {
        setLocation(undefined)
        setGettingLocation(false)
      },
      { timeout: 5000, enableHighAccuracy: false }
    )
  }

  const showSaveFeedback = (success: boolean) => {
    setSaveFeedback({ show: true, success })
    setTimeout(() => {
      setSaveFeedback({ show: false, success: true })
    }, 2000)
  }

  const resetAllInputs = () => {
    setTextContent('')
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingTime(0)
    setImageFile(null)
    setImagePreview(null)
    setUploadProgress(0)
    setImageDescription('')
  }

  const handleSaveText = async () => {
    if (!textContent.trim() || saving) return
    setSaving(true)
    try {
      const result = await api.createNote({
        content: textContent.trim(),
        type: 'text',
        location
      })
      if (result) {
        showSaveFeedback(true)
        resetAllInputs()
        onNoteCreated()
      } else {
        showSaveFeedback(false)
      }
    } catch {
      showSaveFeedback(false)
    } finally {
      setSaving(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new AudioContext()
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 128
      sourceRef.current.connect(analyserRef.current)

      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setRecordedBlob(blob)
        setRecordedUrl(url)
        stream.getTracks().forEach(track => track.stop())
        if (sourceRef.current) sourceRef.current.disconnect()
        if (audioContextRef.current) audioContextRef.current.close()
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      setWaveformData(new Array(40).fill(3))

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      animateWaveform()
    } catch (err) {
      console.error('无法访问麦克风:', err)
      alert('无法访问麦克风，请检查浏览器权限设置。')
    }
  }

  const animateWaveform = () => {
    if (!analyserRef.current) return
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const lastWaveformRef = useRef<number[]>(new Array(40).fill(8))

    const draw = () => {
      if (!analyserRef.current || !isRecording || isPaused) return
      animationFrameRef.current = requestAnimationFrame(draw)
      analyserRef.current.getByteFrequencyData(dataArray)
      const step = Math.floor(bufferLength / 40)
      const newWaveform: number[] = []
      for (let i = 0; i < 40; i++) {
        const value = dataArray[i * step] || 0
        const height = Math.max(3, (value / 255) * 60)
        newWaveform.push(height)
      }
      lastWaveformRef.current = [...newWaveform]
      setWaveformData(newWaveform)
    }

    draw()
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      setWaveformData(prev => {
        const frozen = [...prev]
        return frozen.map(h => Math.max(h, 6))
      })
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        const draw = () => {
          if (!analyserRef.current || !isRecording) return
          const isPausedCheck = mediaRecorderRef.current?.state === 'paused'
          if (isPausedCheck) return
          animationFrameRef.current = requestAnimationFrame(draw)
          analyserRef.current.getByteFrequencyData(dataArray)
          const step = Math.floor(bufferLength / 40)
          const newWaveform: number[] = []
          for (let i = 0; i < 40; i++) {
            const value = dataArray[i * step] || 0
            newWaveform.push(Math.max(3, (value / 255) * 60))
          }
          setWaveformData(newWaveform)
        }
        draw()
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }

  const handleSaveVoice = async () => {
    if (!recordedBlob || saving) return
    setSaving(true)
    try {
      const voiceFile = new File([recordedBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
      const { url, duration } = await api.uploadVoice(voiceFile, setUploadProgress)
      const result = await api.createNote({
        content: `语音记录 (${formatTime(recordingTime)})`,
        type: 'voice',
        location,
        voiceUrl: url,
        voiceDuration: duration || recordingTime
      })
      if (result) {
        showSaveFeedback(true)
        resetAllInputs()
        onNoteCreated()
      } else {
        showSaveFeedback(false)
      }
    } catch {
      showSaveFeedback(false)
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB')
      return
    }
    setImageFile(file)
    setUploadProgress(0)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleSaveImage = async () => {
    if (!imageFile || saving) return
    setSaving(true)
    try {
      const imageUrl = await api.uploadImage(imageFile, setUploadProgress)
      const content = imageDescription.trim() || `图片记录`
      const result = await api.createNote({
        content,
        type: 'image',
        location,
        imageUrl
      })
      if (result) {
        showSaveFeedback(true)
        resetAllInputs()
        onNoteCreated()
      } else {
        showSaveFeedback(false)
      }
    } catch {
      showSaveFeedback(false)
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="note-input-container">
      <div className="mode-tabs">
        <button
          className={`mode-tab ${inputMode === 'text' ? 'active' : ''}`}
          onClick={() => setInputMode('text')}
        >
          <span className="tab-icon">✏️</span>
          <span>文字</span>
        </button>
        <button
          className={`mode-tab ${inputMode === 'voice' ? 'active' : ''}`}
          onClick={() => setInputMode('voice')}
        >
          <span className="tab-icon">🎤</span>
          <span>语音</span>
        </button>
        <button
          className={`mode-tab ${inputMode === 'image' ? 'active' : ''}`}
          onClick={() => setInputMode('image')}
        >
          <span className="tab-icon">🖼️</span>
          <span>图片</span>
        </button>
      </div>

      <div className="input-panel">
        <div className="location-badge">
          {gettingLocation ? (
            <span className="loc-loading">📍 获取位置中...</span>
          ) : location ? (
            <span>📍 {location}</span>
          ) : (
            <span className="loc-unknown">📍 未知位置</span>
          )}
          <button
            className="refresh-loc-btn"
            onClick={getCurrentLocation}
            title="刷新位置"
            disabled={gettingLocation}
          >
            🔄
          </button>
        </div>

        {inputMode === 'text' && (
          <div className="text-input-section">
            <textarea
              className="text-textarea"
              placeholder="记录此刻的灵感与想法..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              maxLength={2000}
              rows={5}
            />
            <div className="input-footer">
              <span className={`char-count ${textContent.length > 1800 ? 'warning' : ''}`}>
                {textContent.length} / 2000
              </span>
              <button
                className="save-btn"
                onClick={handleSaveText}
                disabled={!textContent.trim() || saving}
              >
                {saving ? (
                  <>
                    <span className="btn-spinner"></span>
                    保存中...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    保存便签
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {inputMode === 'voice' && (
          <div className="voice-input-section">
            {!isRecording && !recordedUrl ? (
              <div className="record-start-area">
                <button className="record-btn" onClick={startRecording}>
                  <div className="record-icon">🎙️</div>
                  <div className="record-hint">点击开始录音</div>
                </button>
              </div>
            ) : (
              <>
                {isRecording && (
                  <div className="recording-panel">
                    <div className="waveform-container">
                      {waveformData.map((height, i) => (
                        <div
                          key={i}
                          className="waveform-bar"
                          style={{
                            height: `${height}px`,
                            animationDelay: `${i * 30}ms`
                          }}
                        />
                      ))}
                    </div>
                    <div className="recording-info">
                      <span className={`recording-indicator ${isPaused ? 'paused' : ''}`}>
                        {isPaused ? '⏸' : '●'} {isPaused ? '已暂停' : '录音中'}
                      </span>
                      <span className="recording-time">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="recording-controls">
                      {!isPaused ? (
                        <button className="control-btn pause-btn" onClick={pauseRecording}>
                          ⏸️ 暂停
                        </button>
                      ) : (
                        <button className="control-btn resume-btn" onClick={resumeRecording}>
                          ▶️ 继续
                        </button>
                      )}
                      <button className="control-btn stop-btn" onClick={stopRecording}>
                        ⏹️ 停止
                      </button>
                    </div>
                  </div>
                )}

                {recordedUrl && !isRecording && (
                  <div className="recorded-preview">
                    <div className="preview-header">
                      <span>📻 录音预览</span>
                      <span className="record-duration">{formatTime(recordingTime)}</span>
                    </div>
                    <audio controls src={recordedUrl} className="audio-player" />
                    {uploadProgress > 0 && (
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${uploadProgress}%` }}
                        />
                        <span className="progress-text">{uploadProgress}%</span>
                      </div>
                    )}
                    <div className="preview-actions">
                      <button
                        className="secondary-btn"
                        onClick={() => {
                          setRecordedUrl(null)
                          setRecordedBlob(null)
                          setRecordingTime(0)
                        }}
                      >
                        🔄 重新录制
                      </button>
                      <button
                        className="save-btn"
                        onClick={handleSaveVoice}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="btn-spinner"></span>
                            保存中...
                          </>
                        ) : (
                          <>
                            <span>💾</span>
                            保存便签
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {inputMode === 'image' && (
          <div className="image-input-section">
            {!imagePreview ? (
              <div
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className="drop-icon">☁️</div>
                <p className="drop-title">点击或拖动图片到此处上传</p>
                <p className="drop-hint">支持 JPG、PNG、GIF 格式，最大 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            ) : (
              <div className="image-preview-section">
                <div className="image-preview-wrapper">
                  <img src={imagePreview} alt="预览" className="image-preview" />
                  <button
                    className="remove-image-btn"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                      setUploadProgress(0)
                    }}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  className="image-desc-input"
                  placeholder="为这张图片添加描述..."
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                    <span className="progress-text">{uploadProgress}%</span>
                  </div>
                )}
                <div className="preview-actions">
                  <button
                    className="secondary-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    🔄 更换图片
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleSaveImage}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="btn-spinner"></span>
                        保存中...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        保存便签
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className={`save-feedback ${saveFeedback.show ? 'show' : ''} ${saveFeedback.success ? 'success' : 'error'}`}>
          {saveFeedback.success ? '✓ 保存成功！' : '✕ 保存失败，请重试'}
        </div>
      </div>
    </div>
  )
}

export default NoteInput
