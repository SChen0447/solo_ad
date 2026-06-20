import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CombatEvent } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface ChartGroupProps {
  events: CombatEvent[];
}

const MONSTER_TYPE_COLORS: Record<string, string> = {
  人形: '#2ed573',
  野兽: '#ffa502',
  亡灵: '#ff6b6b',
  元素: '#1e90ff',
  恶魔: '#a29bfe',
};

const ChartGroup = ({ events }: ChartGroupProps) => {
  const { theme } = useTheme();
  const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'area'>('bar');

  const textColor = theme === 'light' ? '#333333' : '#e0e0e0';
  const gridColor = theme === 'light' ? '#e0e0e0' : '#3d3d5c';

  const damageByMonster = useMemo(() => {
    const data: Record<string, number> = {};
    events.forEach((e) => {
      data[e.monster_name] = (data[e.monster_name] || 0) + e.damage;
    });
    return Object.entries(data)
      .map(([name, damage]) => ({ name, damage }))
      .sort((a, b) => b.damage - a.damage);
  }, [events]);

  const damageByHour = useMemo(() => {
    const data: Record<string, number> = {};
    events.forEach((e) => {
      const date = new Date(e.timestamp);
      const hour = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
      data[hour] = (data[hour] || 0) + e.damage;
    });
    return Object.entries(data)
      .map(([time, damage]) => ({ time, damage }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [events]);

  const killsByTypeOverTime = useMemo(() => {
    const timeMap: Record<string, Record<string, number>> = {};
    const types = new Set<string>();

    events
      .filter((e) => e.is_kill)
      .forEach((e) => {
        const date = new Date(e.timestamp);
        const day = `${date.getMonth() + 1}/${date.getDate()}`;
        if (!timeMap[day]) timeMap[day] = {};
        timeMap[day][e.monster_type] = (timeMap[day][e.monster_type] || 0) + 1;
        types.add(e.monster_type);
      });

    const sortedDays = Object.keys(timeMap).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedDays.map((day) => {
      const item: Record<string, string | number> = { day };
      types.forEach((type) => {
        item[type] = timeMap[day][type] || 0;
      });
      return item;
    });
  }, [events]);

  const monsterTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((e) => types.add(e.monster_type));
    return Array.from(types);
  }, [events]);

  const chartTabs = [
    { key: 'bar', label: '伤害柱状图' },
    { key: 'line', label: '时间趋势图' },
    { key: 'area', label: '击杀面积图' },
  ];

  return (
    <div className="chart-group">
      <div className="chart-tabs">
        {chartTabs.map((tab) => (
          <button
            key={tab.key}
            className={`chart-tab ${activeChart === tab.key ? 'active' : ''}`}
            onClick={() => setActiveChart(tab.key as typeof activeChart)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="chart-container">
        <AnimatePresence mode="wait">
          {activeChart === 'bar' && (
            <motion.div
              key="bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="chart-wrapper"
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={damageByMonster} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    stroke={textColor}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke={textColor} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'light' ? '#fff' : '#2d2d44',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      color: textColor,
                    }}
                  />
                  <Legend wrapperStyle={{ color: textColor }} verticalAlign="top" />
                  <Bar dataKey="damage" name="累计伤害" fill="url(#colorGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b6b" />
                      <stop offset="100%" stopColor="#ffa502" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {activeChart === 'line' && (
            <motion.div
              key="line"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="chart-wrapper"
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={damageByHour} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="time" stroke={textColor} tick={{ fontSize: 12 }} />
                  <YAxis stroke={textColor} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'light' ? '#fff' : '#2d2d44',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      color: textColor,
                    }}
                  />
                  <Legend wrapperStyle={{ color: textColor }} verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="damage"
                    name="总伤害"
                    stroke="#1e90ff"
                    strokeWidth={2}
                    dot={{ r: 5, fill: '#1e90ff' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {activeChart === 'area' && (
            <motion.div
              key="area"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="chart-wrapper"
            >
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={killsByTypeOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="day" stroke={textColor} tick={{ fontSize: 12 }} />
                  <YAxis stroke={textColor} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'light' ? '#fff' : '#2d2d44',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      color: textColor,
                    }}
                  />
                  <Legend wrapperStyle={{ color: textColor }} verticalAlign="top" />
                  {monsterTypes.map((type) => (
                    <Area
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stackId="1"
                      stroke={MONSTER_TYPE_COLORS[type] || '#999'}
                      fill={MONSTER_TYPE_COLORS[type] || '#999'}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChartGroup;
