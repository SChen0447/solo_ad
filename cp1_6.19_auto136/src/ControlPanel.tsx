import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { SensorData, ControlParams } from './SensorSimulator';
import type { GrowthHistoryPoint, PlantType, PlantState } from './PlantGrowthModel';
import { PLANT_CONFIGS } from './PlantGrowthModel';
import { clamp, formatDateTime, formatTime, normalize } from './utils';

interface ControlPanelProps {
  sensorData: SensorData | null;
  prevSensorData: SensorData | null;
  controlParams: ControlParams;
  plantStates: Record<PlantType, PlantState> | null;
  growthHistory: Record<PlantType, GrowthHistoryPoint[]>;
  onControlChange: (params: Partial<ControlParams>) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  icon: string;
  color: string;
  onChange: (value: number) => void;
  onChangeEnd: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, unit, icon, color, onChange, onChangeEnd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const lastValueRef = useRef(value);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    if (!isDragging) {
      setDisplayValue(value);
    }
  }, [value, isDragging]);

  const getValueFromPosition = useCallback((clientX: number) => {
    if (!sliderRef.current) return displayValue;
    const rect = sliderRef.current.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const rawVal = min + ratio * (max - min);
    return rawVal;
  }, [min, max, displayValue]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const val = getValueFromPosition(e.clientX);
    setDisplayValue(val);
    onChange(val);
    velocityRef.current = 0;

    const rect = sliderRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((prev) => [...prev, { id: rippleIdRef.current++, x, y }]);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newVal = getValueFromPosition(e.clientX);
      velocityRef.current = newVal - lastValueRef.current;
      lastValueRef.current = newVal;
      setDisplayValue(newVal);
      onChange(newVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const snapped = Math.round(displayValue);
      setDisplayValue(snapped);
      onChangeEnd(snapped);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, getValueFromPosition, displayValue, onChangeEnd]);

  useEffect(() => {
    if (ripples.length === 0) return;
    const timer = setTimeout(() => {
      setRipples((prev) => prev.slice(1));
    }, 600);
    return () => clearTimeout(timer);
  }, [ripples]);

  const percentage = normalize(displayValue, min, max) * 100;

  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(15, 30, 50, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid rgba(100, 200, 180, 0.15)',
        transition: 'border-color 0.3s, box-shadow 0.3s'
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(100, 255, 180, 0.5)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(100, 255, 180, 0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(100, 200, 180, 0.15)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{ color: '#a0c4d0', fontSize: '13px', fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ color, fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(displayValue)}{unit}
        </span>
      </div>
      <div
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative',
          height: '8px',
          background: 'rgba(50, 80, 100, 0.5)',
          borderRadius: '4px',
          cursor: 'pointer',
          overflow: 'visible'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
            borderRadius: '4px',
            transition: isDragging ? 'none' : 'width 0.15s ease-out'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 10px)`,
            top: '-6px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: color,
            border: '2px solid #fff',
            boxShadow: `0 0 10px ${color}88`,
            cursor: 'grab',
            transition: isDragging ? 'none' : 'left 0.15s ease-out',
            transform: isDragging ? 'scale(1.2)' : 'scale(1)'
          }}
        />
        {ripples.map((r) => (
          <span
            key={r.id}
            style={{
              position: 'absolute',
              left: r.x - 15,
              top: r.y - 15,
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              pointerEvents: 'none',
              animation: 'ripple 0.6s ease-out forwards'
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface MiniBarChartProps {
  value: number;
  min: number;
  max: number;
  color: string;
  direction: 'up' | 'down' | 'none';
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({ value, min, max, color, direction }) => {
  const [bars, setBars] = useState<number[]>(() => {
    const arr: number[] = [];
    for (let i = 0; i < 10; i++) {
      arr.push(0.3 + Math.random() * 0.7);
    }
    return arr;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setBars((prev) => {
        const newBars = [...prev.slice(1)];
        const target = normalize(value, min, max);
        newBars.push(clamp(target + (Math.random() - 0.5) * 0.3, 0.05, 1));
        return newBars;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [value, min, max]);

  const flashColor = direction === 'up' ? 'rgba(100, 255, 150, 0.3)' : direction === 'down' ? 'rgba(255, 100, 100, 0.3)' : 'transparent';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '3px',
        height: '30px',
        padding: '4px 6px',
        background: flashColor,
        borderRadius: '4px',
        transition: 'background 0.3s'
      }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: `${h * 100}%`,
            background: color,
            borderRadius: '2px',
            opacity: 0.5 + (i / bars.length) * 0.5,
            transition: 'height 0.2s ease-out'
          }}
        />
      ))}
    </div>
  );
};

interface InfoCardProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  color: string;
  prevValue: number | null;
  icon: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value, unit, min, max, color, prevValue, icon }) => {
  const direction: 'up' | 'down' | 'none' = prevValue === null ? 'none' : value > prevValue ? 'up' : value < prevValue ? 'down' : 'none';

  return (
    <div
      style={{
        background: 'rgba(15, 30, 50, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '10px',
        padding: '12px 14px',
        border: `1px solid ${color}22`,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        minWidth: '130px'
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}66`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 15px ${color}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}22`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span style={{ color: '#90b0c0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color, fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(1)}
          <span style={{ fontSize: '12px', color: '#7090a0', marginLeft: '2px' }}>{unit}</span>
        </span>
        <MiniBarChart value={value} min={min} max={max} color={color} direction={direction} />
      </div>
    </div>
  );
};

interface TrendChartProps {
  history: Record<PlantType, GrowthHistoryPoint[]>;
  plantStates: Record<PlantType, PlantState> | null;
}

const TrendChart: React.FC<TrendChartProps> = ({ history, plantStates }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePlants, setVisiblePlants] = useState<Record<PlantType, boolean>>({
    tomato: true,
    lettuce: true,
    eggplant: true,
    pepper: true
  });
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; type: PlantType; time: string; height: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 180 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: 180 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const { width, height } = dimensions;
    const margin = { top: 15, right: 15, bottom: 25, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const xScale = d3.scaleTime()
      .domain([twentyFourHoursAgo, now])
      .range([0, innerWidth]);

    const maxHeight = Math.max(
      3,
      ...(Object.keys(history) as PlantType[]).flatMap((t) =>
        visiblePlants[t] ? history[t].map((p) => p.height) : [0]
      )
    );

    const yScale = d3.scaleLinear()
      .domain([0, maxHeight * 1.1])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const gridLines = g.append('g').attr('class', 'grid');
    yScale.ticks(4).forEach((tick) => {
      gridLines.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', 'rgba(100, 150, 180, 0.1)')
        .attr('stroke-dasharray', '3,3');
    });

    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => formatTime(d as Date));
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#608090')
      .style('font-size', '10px');
    g.selectAll('.domain, .tick line').attr('stroke', 'rgba(100, 150, 180, 0.3)');

    const yAxis = d3.axisLeft(yScale).ticks(4).tickFormat((d) => `${d}m`);
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#608090')
      .style('font-size', '10px');
    g.selectAll('.domain, .tick line').attr('stroke', 'rgba(100, 150, 180, 0.3)');

    (Object.keys(history) as PlantType[]).forEach((type) => {
      if (!visiblePlants[type]) return;
      const data = history[type];
      if (data.length < 2) return;

      const config = PLANT_CONFIGS[type];
      const colorStr = `rgb(${config.baseColor.r}, ${config.baseColor.g}, ${config.baseColor.b})`;

      const line = d3.line<GrowthHistoryPoint>()
        .x((d) => xScale(d.timestamp))
        .y((d) => yScale(d.height))
        .curve(d3.curveMonotoneX);

      const path = g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', colorStr)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .style('filter', `drop-shadow(0 0 4px ${colorStr}88)`);

      const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      const lastPoint = data[data.length - 1];
      g.append('circle')
        .attr('cx', xScale(lastPoint.timestamp))
        .attr('cy', yScale(lastPoint.height))
        .attr('r', 4)
        .attr('fill', colorStr)
        .style('filter', `drop-shadow(0 0 6px ${colorStr})`);

      const area = d3.area<GrowthHistoryPoint>()
        .x((d) => xScale(d.timestamp))
        .y0(innerHeight)
        .y1((d) => yScale(d.height))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data)
        .attr('fill', colorStr)
        .attr('opacity', 0.08)
        .attr('d', area);
    });

    const overlay = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay.on('mousemove', (event: MouseEvent) => {
      const [mx] = d3.pointer(event);
      const date = xScale.invert(mx);

      let closest: { type: PlantType; point: GrowthHistoryPoint; dist: number } | null = null;
      (Object.keys(history) as PlantType[]).forEach((type) => {
        if (!visiblePlants[type] || history[type].length === 0) return;
        const point = history[type].reduce((prev, curr) =>
          Math.abs(curr.timestamp.getTime() - date.getTime()) < Math.abs(prev.timestamp.getTime() - date.getTime()) ? curr : prev
        );
        const dist = Math.abs(point.timestamp.getTime() - date.getTime());
        if (!closest || dist < closest.dist) {
          closest = { type, point, dist };
        }
      });

      if (closest && closest.dist < 30 * 60 * 1000) {
        setHoverInfo({
          x: xScale(closest.point.timestamp) + margin.left,
          y: yScale(closest.point.height) + margin.top,
          type: closest.type,
          time: formatDateTime(closest.point.timestamp),
          height: closest.point.height
        });
      } else {
        setHoverInfo(null);
      }
    });

    overlay.on('mouseleave', () => setHoverInfo(null));
  }, [history, visiblePlants, dimensions, plantStates]);

  const plantColors: Record<PlantType, string> = {} as Record<PlantType, string>;
  (Object.keys(PLANT_CONFIGS) as PlantType[]).forEach((t) => {
    const c = PLANT_CONFIGS[t].baseColor;
    plantColors[t] = `rgb(${c.r}, ${c.g}, ${c.b})`;
  });

  return (
    <div
      style={{
        background: 'rgba(15, 30, 50, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid rgba(100, 200, 180, 0.15)',
        transition: 'border-color 0.3s, box-shadow 0.3s'
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(100, 255, 180, 0.4)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(100, 255, 180, 0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(100, 200, 180, 0.15)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ color: '#b0d0e0', fontSize: '14px', fontWeight: 600 }}>📈 生长趋势（24小时）</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(Object.keys(PLANT_CONFIGS) as PlantType[]).map((type) => (
            <label
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: '#80a0b0',
                fontSize: '12px',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={visiblePlants[type]}
                onChange={(e) => setVisiblePlants((prev) => ({ ...prev, [type]: e.target.checked }))}
                style={{
                  accentColor: plantColors[type],
                  cursor: 'pointer'
                }}
              />
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: plantColors[type],
                  boxShadow: `0 0 6px ${plantColors[type]}`
                }}
              />
              {PLANT_CONFIGS[type].name}
            </label>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ position: 'relative' }}>
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
        {hoverInfo && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hoverInfo.x + 10, dimensions.width - 130),
              top: Math.max(hoverInfo.y - 50, 5),
              background: 'rgba(10, 25, 40, 0.95)',
              border: `1px solid ${plantColors[hoverInfo.type]}`,
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#c0e0e8',
              pointerEvents: 'none',
              boxShadow: `0 0 10px ${plantColors[hoverInfo.type]}44`,
              zIndex: 10
            }}
          >
            <div style={{ fontWeight: 600, color: plantColors[hoverInfo.type], marginBottom: '3px' }}>
              {PLANT_CONFIGS[hoverInfo.type].name}
            </div>
            <div>时间: {hoverInfo.time}</div>
            <div>高度: {hoverInfo.height.toFixed(2)}m</div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  sensorData,
  prevSensorData,
  controlParams,
  plantStates,
  growthHistory,
  onControlChange
}) => {
  return (
    <>
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <InfoCard
            label="温度"
            value={sensorData?.temperature ?? 0}
            unit="°C"
            min={22}
            max={35}
            color="#ff8866"
            prevValue={prevSensorData?.temperature ?? null}
            icon="🌡️"
          />
          <InfoCard
            label="湿度"
            value={sensorData?.humidity ?? 0}
            unit="%"
            min={40}
            max={90}
            color="#66bbff"
            prevValue={prevSensorData?.humidity ?? null}
            icon="💧"
          />
          <InfoCard
            label="光照"
            value={sensorData?.lightIntensity ?? 0}
            unit="%"
            min={0}
            max={100}
            color="#ffdd66"
            prevValue={prevSensorData?.lightIntensity ?? null}
            icon="☀️"
          />
          <InfoCard
            label="土壤含水"
            value={sensorData?.soilMoisture ?? 0}
            unit="%"
            min={0}
            max={100}
            color="#88dd99"
            prevValue={prevSensorData?.soilMoisture ?? null}
            icon="🌱"
          />
        </div>

        <TrendChart history={growthHistory} plantStates={plantStates} />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          gap: '16px',
          zIndex: 10
        }}
      >
        <Slider
          label="灌溉水量"
          value={controlParams.irrigation}
          min={0}
          max={100}
          unit="%"
          icon="💦"
          color="#44aadd"
          onChange={(v) => onControlChange({ irrigation: v })}
          onChangeEnd={(v) => onControlChange({ irrigation: v })}
        />
        <Slider
          label="遮阳帘"
          value={controlParams.shading}
          min={0}
          max={100}
          unit="%"
          icon="🌤️"
          color="#aabb88"
          onChange={(v) => onControlChange({ shading: v })}
          onChangeEnd={(v) => onControlChange({ shading: v })}
        />
        <Slider
          label="CO₂浓度"
          value={controlParams.co2Concentration}
          min={0}
          max={100}
          unit="%"
          icon="🫧"
          color="#bb88dd"
          onChange={(v) => onControlChange({ co2Concentration: v })}
          onChangeEnd={(v) => onControlChange({ co2Concentration: v })}
        />
      </div>
    </>
  );
};
