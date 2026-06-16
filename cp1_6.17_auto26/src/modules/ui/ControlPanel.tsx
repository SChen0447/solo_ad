import { useState, useEffect, useMemo, useCallback } from 'react';
import { CityNode, parseRouteText, generateId, ParseResult } from '../parser/CityParser';
import { validateRoute, ValidatedRoute, ValidationIssue } from '../parser/Validator';
import { AnimationState } from '../renderer/AnimationController';
import styles from './ControlPanel.module.css';

export interface ControlPanelProps {
  cities: CityNode[];
  setCities: (cities: CityNode[]) => void;
  animationState: AnimationState;
  onProgressChange: (progress: number) => void;
  onPlayAnimation: () => void;
  onPauseAnimation: () => void;
  onResetAnimation: () => void;
  selectedCityId: string | null;
  onSelectCity: (cityId: string | null) => void;
  validatedRoute: ValidatedRoute;
}

export default function ControlPanel({
  cities,
  setCities,
  animationState,
  onProgressChange,
  onPlayAnimation,
  onPauseAnimation,
  onResetAnimation,
  selectedCityId,
  onSelectCity,
  validatedRoute,
}: ControlPanelProps) {
  const [inputText, setInputText] = useState<string>('从北京出发，经停上海2天，然后飞往东京，最后去京都');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonEditorText, setJsonEditorText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const totalDays = useMemo(() => {
    return cities.reduce((sum, c) => sum + (c.days || 0), 0);
  }, [cities]);

  useEffect(() => {
    if (cities.length > 0) {
      setJsonEditorText(JSON.stringify(cities, null, 2));
    }
  }, [cities]);

  const handleParse = useCallback(async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseRouteText(inputText);
      setParseResult(result);
      if (result.cities.length > 0) {
        const validated = validateRoute(result.cities);
        setCities(validated.cities);
      }
    } catch (e) {
      console.error('Parse error:', e);
    } finally {
      setIsParsing(false);
    }
  }, [inputText, setCities]);

  const handleCityNameChange = useCallback((id: string, newName: string) => {
    setCities(cities.map(c => {
      if (c.id === id) {
        return { ...c, name: newName };
      }
      return c;
    }));
  }, [cities, setCities]);

  const handleDaysChange = useCallback((id: string, newDays: number) => {
    setCities(cities.map(c => {
      if (c.id === id) {
        return { ...c, days: Math.max(1, Math.min(365, Math.round(newDays))) };
      }
      return c;
    }));
  }, [cities, setCities]);

  const handleDeleteCity = useCallback((id: string) => {
    const newCities = cities.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i }));
    if (selectedCityId === id) onSelectCity(null);
    setCities(newCities);
    onResetAnimation();
  }, [cities, selectedCityId, setCities, onSelectCity, onResetAnimation]);

  const handleAddCity = useCallback(() => {
    const newCity: CityNode = {
      id: generateId(),
      name: '',
      lat: 0,
      lng: 0,
      days: 1,
      order: cities.length,
    };
    setCities([...cities, newCity]);
  }, [cities, setCities]);

  const handleApplyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonEditorText);
      if (Array.isArray(parsed)) {
        const validArr = parsed.map((c, i) => ({
          id: c.id || generateId(),
          name: c.name || '',
          nameEn: c.nameEn,
          lat: Number(c.lat) || 0,
          lng: Number(c.lng) || 0,
          days: Math.max(1, Math.round(Number(c.days) || 1)),
          attractions: Array.isArray(c.attractions) ? c.attractions : undefined,
          order: i,
        }));
        const validated = validateRoute(validArr);
        setCities(validated.cities);
        setJsonError('');
        onResetAnimation();
      } else {
        setJsonError('JSON格式错误：应为数组');
      }
    } catch (e) {
      setJsonError(`JSON解析错误：${(e as Error).message}`);
    }
  }, [jsonEditorText, setCities, onResetAnimation]);

  const renderIssueBadge = (issues: ValidationIssue[], cityId: string) => {
    const cityIssues = issues.filter(i => i.cityId === cityId);
    if (cityIssues.length === 0) return null;
    const hasError = cityIssues.some(i => i.type === 'error');
    return (
      <span className={`${styles.issueBadge} ${hasError ? styles.error : styles.warning}`} title={cityIssues.map(i => i.message).join('\n')}>
        {cityIssues.length}
      </span>
    );
  };

  const totalArcs = cities.length - 1;
  const progressPercent = Math.round(animationState.progress * 100);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.title}>🗺️ 旅行路线</h2>
        <div className={styles.stats}>
          <span className={styles.statItem}>
            <span className={styles.statLabel}>城市</span>
            <span className={styles.statValue}>{cities.length}</span>
          </span>
          <span className={styles.statDivider}></span>
          <span className={styles.statItem}>
            <span className={styles.statLabel}>天数</span>
            <span className={styles.statValue}>{totalDays}</span>
          </span>
          <span className={styles.statDivider}></span>
          <span className={styles.statItem}>
            <span className={styles.statLabel}>距离</span>
            <span className={styles.statValue}>{validatedRoute.totalDistanceKm < 1 ? '—' : `${(validatedRoute.totalDistanceKm / 1000).toFixed(1)}k km`}</span>
          </span>
        </div>
      </div>

      <div className={styles.inputSection}>
        <label className={styles.inputLabel}>输入旅行路线</label>
        <textarea
          className={styles.textarea}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="例如：从北京出发，经停上海2天，然后飞往东京、京都..."
          rows={3}
        />
        <div className={styles.buttonRow}>
          <button
            className={`${styles.primaryBtn} ${isParsing ? styles.loading : ''}`}
            onClick={handleParse}
            disabled={isParsing || !inputText.trim()}
          >
            {isParsing ? '解析中...' : '✨ 解析路线'}
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => setShowJsonEditor(!showJsonEditor)}
          >
            {showJsonEditor ? '收起' : '{ } JSON'}
          </button>
        </div>
      </div>

      {parseResult && parseResult.warnings.length > 0 && (
        <div className={styles.warningBox}>
          {parseResult.warnings.map((w, i) => (
            <div key={i} className={styles.warningItem}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {showJsonEditor && (
        <div className={styles.jsonEditor}>
          <label className={styles.inputLabel}>编辑城市数据(JSON)</label>
          <textarea
            className={styles.jsonTextarea}
            value={jsonEditorText}
            onChange={(e) => setJsonEditorText(e.target.value)}
            rows={10}
            spellCheck={false}
          />
          {jsonError && <div className={styles.jsonError}>{jsonError}</div>}
          <button className={styles.primaryBtn} onClick={handleApplyJson}>
            ✓ 应用修改
          </button>
        </div>
      )}

      <div className={styles.cityListHeader}>
        <h3 className={styles.subTitle}>📍 城市列表</h3>
        <button className={styles.addBtn} onClick={handleAddCity}>
          + 添加
        </button>
      </div>

      <div className={styles.cityList}>
        {cities.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🌍</div>
            <div>还没有城市，输入路线开始吧！</div>
          </div>
        )}
        {cities.map((city, index) => (
          <div
            key={city.id}
            className={`${styles.cityCard} ${selectedCityId === city.id ? styles.selected : ''}`}
            onClick={() => onSelectCity(city.id === selectedCityId ? null : city.id)}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={styles.cityIndex}>{index + 1}</div>
            <div className={styles.cityContent}>
              <div className={styles.cityNameRow}>
                <input
                  type="text"
                  className={styles.cityNameInput}
                  value={city.name}
                  onChange={(e) => handleCityNameChange(city.id, e.target.value)}
                  placeholder="城市名称"
                  onClick={(e) => e.stopPropagation()}
                />
                {renderIssueBadge(validatedRoute.issues, city.id)}
              </div>
              {city.nameEn && (
                <div className={styles.cityEnName}>{city.nameEn}</div>
              )}
              {city.attractions && city.attractions.length > 0 && selectedCityId === city.id && (
                <div className={styles.attractions}>
                  <div className={styles.attractionsLabel}>🏛️ 推荐景点</div>
                  <div className={styles.attractionsList}>
                    {city.attractions.slice(0, 3).map((a, i) => (
                      <span key={i} className={styles.attractionTag}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.cityMeta}>
                <span className={styles.coords}>
                  {city.lat.toFixed(2)}°, {city.lng.toFixed(2)}°
                </span>
                <div className={styles.daysControl} onClick={(e) => e.stopPropagation()}>
                  <button
                    className={styles.daysBtn}
                    onClick={() => handleDaysChange(city.id, city.days - 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className={styles.daysInput}
                    value={city.days}
                    onChange={(e) => handleDaysChange(city.id, parseInt(e.target.value, 10) || 1)}
                    min={1}
                    max={365}
                  />
                  <span className={styles.daysLabel}>天</span>
                  <button
                    className={styles.daysBtn}
                    onClick={() => handleDaysChange(city.id, city.days + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <button
              className={styles.deleteBtn}
              onClick={(e) => { e.stopPropagation(); handleDeleteCity(city.id); }}
              title="删除城市"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {totalArcs >= 1 && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <h3 className={styles.subTitle}>🎬 路线预览</h3>
            <span className={styles.progressPercent}>{progressPercent}%</span>
          </div>
          <div className={styles.progressControls}>
            <button
              className={styles.controlBtn}
              onClick={onResetAnimation}
              title="重置"
            >
              ⏮
            </button>
            <button
              className={`${styles.controlBtn} ${styles.playBtn}`}
              onClick={animationState.isPlaying ? onPauseAnimation : onPlayAnimation}
              title={animationState.isPlaying ? '暂停' : '播放'}
            >
              {animationState.isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className={styles.controlBtn}
              onClick={() => onProgressChange(1)}
              title="结束"
            >
              ⏭
            </button>
          </div>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={1000}
              value={Math.round(animationState.progress * 1000)}
              onChange={(e) => onProgressChange(parseInt(e.target.value, 10) / 1000)}
            />
            <div className={styles.sliderMarkers}>
              {cities.map((city, i) => {
                const pct = totalArcs > 0 ? (i / totalArcs) * 100 : i * 50;
                const isActive = i <= animationState.currentArcIndex;
                return (
                  <div
                    key={city.id}
                    className={`${styles.sliderMarker} ${isActive ? styles.active : ''}`}
                    style={{ left: `${pct}%` }}
                    title={city.name}
                  />
                );
              })}
            </div>
          </div>
          {animationState.currentArcIndex < totalArcs && (
            <div className={styles.currentRoute}>
              当前: <strong>{cities[animationState.currentArcIndex]?.name}</strong>
              {' → '}
              <strong>{cities[animationState.currentArcIndex + 1]?.name}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
