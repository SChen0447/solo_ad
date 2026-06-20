import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import axios from 'axios';
import { SYMPTOM_OPTIONS, SubmitFormData, PlantCase } from '../types';

const DEFAULT_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZBRjBFNiIvPgogIDxlbGxpcHNlIGN4PSIxMDAiIGN5PSIxNTAiIHJ4PSI0MCIgcnk9IjI1IiBmaWxsPSIjOUI3NjU2Ii8+CiAgPHBhdGggZD0iTTEwMCAxNTAgTDgwIDgwIFE2MCA2MCA3MCA0MCBROTAgNTAgMTAwIDgwIiBmaWxsPSIjNTVEQjJGIiBvcGFjaXR5PSIwLjgiLz4KICA8cGF0aCBkPSJNMTAwIDE1MCBMMTIwIDgwIFFMTQwIDYwIDEzMCA0MCBRMTEwIDUwIDEwMCA4MCIgZmlsbD0iIzU1QkMyRiIgb3BhY2l0eT0iMC44Ii8+CiAgPHBhdGggZD0iTTEwMCAxNTAgTDEwMCA2MCBRODAgNDAgOTAgMjAgUTExMCAzMCAxMDAgNjAiIGZpbGw9IiM0RjlBNDYiLz4KPC9zdmc+';

interface PlantFormProps {
  onSubmitted?: () => void;
}

const LoadingPlant: React.FC = () => (
  <svg className="loading-plant" viewBox="0 0 80 80" fill="none">
    <path d="M40 8 C24 24, 16 40, 24 64 C40 56, 56 56, 56 64 C64 40, 56 24, 40 8 Z" fill="#556B2F" />
    <path d="M40 24 L40 64" stroke="#3a4a1f" strokeWidth="4" fill="none" />
  </svg>
);

const UploadIcon: React.FC = () => (
  <svg className="upload-icon" viewBox="0 0 64 64" fill="none">
    <rect x="8" y="16" width="48" height="40" rx="4" stroke="#556B2F" strokeWidth="3" fill="none" />
    <circle cx="24" cy="32" r="6" fill="#556B2F" />
    <path d="M12 52 L28 36 L36 44 L44 34 L52 44" stroke="#556B2F" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M48 8 L48 20 M42 14 L48 8 L54 14" stroke="#556B2F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface HealthRingProps {
  confidence: number;
  severity: string;
}

const HealthRing: React.FC<HealthRingProps> = ({ confidence, severity }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;

  let gradientId = 'url(#greenGradient';
  if (severity === 'high') {
    gradientId = 'url(#redGradient)';
  } else if (severity === 'medium') {
    gradientId = 'url(#yellowGradient)';
  } else if (severity === 'low') {
    gradientId = 'url(#greenGradient)';
  }

  return (
    <div className="health-ring">
      <svg width="100" height="100">
        <defs>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e74c3c" />
            <stop offset="100%" stopColor="#c0392b" />
          </linearGradient>
          <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f39c12" />
            <stop offset="100%" stopColor="#e67e22" />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#27ae60" />
            <stop offset="100%" stopColor="#2ecc71" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e8f0d8" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={gradientId}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="health-ring-label">{confidence}%</span>
    </div>
  );
};

const PlantForm: React.FC<PlantFormProps> = ({ onSubmitted }) => {
  const [plantName, setPlantName] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(25);
  const [humidity, setHumidity] = useState(60);
  const [lightHours, setLightHours] = useState(6);
  const [image, setImage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PlantCase | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSymptom = (symptom: string) => {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClickUpload = () => {
    if (!image) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage('');
  };

  const handleSubmit = async () => {
    if (!plantName.trim() || symptoms.length === 0) {
      return;
    }

    const formData: SubmitFormData = {
      plant_name: plantName,
      symptoms,
      temperature,
      humidity,
      light_hours: lightHours,
      image: image || DEFAULT_IMAGE,
    };

    setIsLoading(true);
    setResult(null);

    try {
      const res = await axios.post<PlantCase>('/api/submit', formData);
      setResult(res.data);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = plantName.trim().length > 0 && symptoms.length > 0 && !isLoading;

  const tempPercent = ((temperature - 0) / (50 - 0)) * 100;
  const humPercent = humidity;
  const lightPercent = (lightHours / 14) * 100;

  return (
    <div>
      {!result && (
        <div className="form-page">
          <div className="card">
            <div
              className={`upload-area ${isDragging ? 'dragover' : ''} ${image ? 'has-image' : ''}`}
              onClick={handleClickUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {image ? (
                <img src={image} alt="预览" className="upload-preview" onClick={handleRemoveImage} />
              ) : (
                <>
                  <UploadIcon />
                  <p className="upload-hint">点击或拖拽图片到此处上传</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="card">
            <div className="form-group">
              <label className="form-label">植物名称</label>
              <input
                type="text"
                className="form-input"
                placeholder="如：月季、番茄、绿萝..."
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                症状描述 <span style={{ color: '#6b7a5a' }}>(已选 {symptoms.length} 项</span>
              </label>
              <div className="symptom-tags">
                {SYMPTOM_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`symptom-tag ${symptoms.includes(opt.key) ? 'selected' : ''}`}
                    onClick={() => toggleSymptom(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">环境参数</label>

              <div className="slider-group">
                <div className="slider-header">
                  <span>温度</span>
                  <span className="slider-value">{temperature}°C</span>
                </div>
                <input
                  type="range"
                  className="slider"
                  min="0"
                  max="50"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  style={{ ['--value' as any]: `${tempPercent}%` }}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>湿度</span>
                  <span className="slider-value">{humidity}%</span>
                </div>
                <input
                  type="range"
                  className="slider"
                  min="0"
                  max="100"
                  value={humidity}
                  onChange={(e) => setHumidity(Number(e.target.value))}
                  style={{ ['--value' as any]: `${humPercent}%` }}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>光照时长</span>
                  <span className="slider-value">{lightHours} 小时</span>
                </div>
                <input
                  type="range"
                  className="slider"
                  min="0"
                  max="14"
                  value={lightHours}
                  onChange={(e) => setLightHours(Number(e.target.value))}
                  style={{ ['--value' as any]: `${lightPercent}%` }}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isLoading ? '诊断中...' : '提交并诊断'}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="card">
          <div className="loading-overlay">
            <LoadingPlant />
            <p className="loading-text">AI 正在分析植物症状...</p>
          </div>
        </div>
      )}

      {result && !isLoading && (
        <div className="card diagnosis-result">
          <div className="diagnosis-header">
            <HealthRing
              confidence={result.diagnosis.confidence}
              severity={result.diagnosis.severity}
            />
            <div className="diagnosis-title">
              <h2>{result.diagnosis.disease}</h2>
              <p className="diagnosis-confidence">
                置信度 {result.diagnosis.confidence}%
              </p>
            </div>
          </div>

          <div className="diagnosis-section">
            <h3>病害描述</h3>
            <p className="diagnosis-description">{result.diagnosis.description}</p>
          </div>

          <div className="diagnosis-section">
            <h3>治理方案</h3>
            <pre className="diagnosis-treatment">{result.diagnosis.treatment}</pre>
          </div>

          <button
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={onSubmitted}
          >
            返回社区查看分享
          </button>
        </div>
      )}
    </div>
  );
};

export default PlantForm;
