import React, { useState, useMemo } from 'react';
import { GanttPlot, GanttRecord, FAMILY_COLORS, FAMILY_NAMES } from '@/types';

interface PlantingTimelineProps {
  data: GanttPlot[];
  quarterRange: number;
}

const PlantingTimeline: React.FC<PlantingTimelineProps> = ({ data, quarterRange }) => {
  const [hoveredRecord, setHoveredRecord] = useState<{ record: GanttRecord; plotName: string; x: number; y: number } | null>(null);

  const { months, startDate, endDate } = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - Math.floor(quarterRange * 3 / 2), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + Math.ceil(quarterRange * 3 / 2), 0);

    const monthList: { year: number; month: number; label: string }[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      monthList.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        label: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return { months: monthList, startDate: start, endDate: end };
  }, [quarterRange]);

  const totalDays = useMemo(() => {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate, endDate]);

  const getPositionAndWidth = (record: GanttRecord) => {
    const plantDate = new Date(record.plantingDate);
    const harvestDate = record.actualHarvestDate
      ? new Date(record.actualHarvestDate)
      : new Date(record.expectedHarvestDate);

    const startOffset = Math.max(0, Math.ceil((plantDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const endOffset = Math.min(totalDays, Math.ceil((harvestDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const width = Math.max(1, endOffset - startOffset);

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(width / totalDays) * 100}%`,
    };
  };

  const handleMouseEnter = (record: GanttRecord, plotName: string, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredRecord({
      record,
      plotName,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleMouseLeave = () => {
    setHoveredRecord(null);
  };

  const todayPosition = useMemo(() => {
    const today = new Date();
    const offset = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, (offset / totalDays) * 100));
  }, [startDate, totalDays]);

  const legendItems = [
    { family: 'solanaceae', name: '茄科' },
    { family: 'brassicaceae', name: '十字花科' },
    { family: 'fabaceae', name: '豆科' },
    { family: 'cucurbitaceae', name: '葫芦科' },
    { family: 'apiaceae', name: '伞形科' },
    { family: 'chenopodiaceae', name: '藜科' },
    { family: 'asteraceae', name: '菊科' },
  ];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-3 mb-4 bg-[#FFFDE7] rounded-lg p-3">
        {legendItems.map((item) => (
          <div key={item.family} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: FAMILY_COLORS[item.family] || '#999' }}
            />
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#FFFDE7] rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex border-b border-green-200 bg-green-50">
              <div className="w-40 flex-shrink-0 p-3 border-r border-green-200 font-semibold text-gray-700 text-sm">
                地块名称
              </div>
              <div className="flex-1 flex">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="flex-1 p-2 text-center text-xs font-medium text-gray-600 border-r border-green-100 last:border-r-0"
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none"
                style={{ left: `calc(160px + ${todayPosition}% * (100% - 160px) / 100%)` }}
              >
                <div className="absolute -top-1 -left-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                  今天
                </div>
              </div>

              {data.map((plot, plotIndex) => (
                <div
                  key={plot.plotId}
                  className={`flex ${plotIndex % 2 === 0 ? 'bg-white/50' : 'bg-green-50/30'}`}
                >
                  <div className="w-40 flex-shrink-0 p-3 border-r border-green-200 text-sm font-medium text-gray-700 truncate">
                    {plot.plotName}
                  </div>
                  <div className="flex-1 relative h-16">
                    {plot.records.map((record) => {
                      const { left, width } = getPositionAndWidth(record);
                      const color = FAMILY_COLORS[record.family] || '#999';

                      if (parseFloat(width) < 0.5) return null;

                      return (
                        <div
                          key={record.id}
                          className="absolute top-2 bottom-2 rounded-md gantt-bar flex items-center px-2 overflow-hidden"
                          style={{
                            left,
                            width,
                            backgroundColor: color,
                            opacity: record.isActive ? 1 : 0.7,
                          }}
                          onMouseEnter={(e) => handleMouseEnter(record, plot.plotName, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <span className="text-white text-xs font-medium truncate">
                            {record.cropName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {hoveredRecord && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px] pointer-events-none fade-in"
          style={{
            left: hoveredRecord.x,
            top: hoveredRecord.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-bold text-gray-800 mb-2">{hoveredRecord.plotName}</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: FAMILY_COLORS[hoveredRecord.record.family] || '#999' }}
              />
              <span className="font-medium">{hoveredRecord.record.cropName}</span>
              <span className="text-gray-500">
                ({FAMILY_NAMES[hoveredRecord.record.family] || hoveredRecord.record.family})
              </span>
            </div>
            <div className="text-gray-600">
              <span className="text-gray-400">种植日期：</span>
              {hoveredRecord.record.plantingDate}
            </div>
            <div className="text-gray-600">
              <span className="text-gray-400">预计收获：</span>
              {hoveredRecord.record.expectedHarvestDate}
            </div>
            {hoveredRecord.record.actualHarvestDate && (
              <div className="text-green-600">
                <span className="text-gray-400">实际收获：</span>
                {hoveredRecord.record.actualHarvestDate}
              </div>
            )}
            {hoveredRecord.record.yield !== null && (
              <div className="text-amber-600">
                <span className="text-gray-400">产量：</span>
                {hoveredRecord.record.yield} kg
              </div>
            )}
            <div className="text-gray-600">
              <span className="text-gray-400">周期：</span>
              {hoveredRecord.record.cycleDays} 天
            </div>
            <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${
              hoveredRecord.record.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {hoveredRecord.record.isActive ? '生长中' : '已收获'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantingTimeline;
