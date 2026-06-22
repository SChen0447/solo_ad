import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { GrowthRecord, Plan, Plant } from '@/types';
import { recordApi } from '@/utils/api';

interface GrowthTimelineProps {
  plans: Plan[];
  plants: Plant[];
}

const GrowthTimeline: React.FC<GrowthTimelineProps> = ({ plans, plants }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    photoUrl: '',
    height: '',
    leafCount: '',
    note: '',
  });

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlanId) return;
    recordApi.list(selectedPlanId).then(setRecords).catch(() => setRecords([]));
  }, [selectedPlanId]);

  const chartData = useMemo(() => {
    const last7 = records
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
    return last7.map((r) => ({
      date: r.date.slice(5),
      height: r.height,
    }));
  }, [records]);

  const trendText = useMemo(() => {
    if (records.length < 2) return { text: '数据不足', color: '#6B7280' };
    const sorted = records.slice().sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-3);
    const plant = plants.find((p) => p.id === plans.find((pl) => pl.id === selectedPlanId)?.plantId);
    const lastRecord = recent[recent.length - 1];

    if (plant && lastRecord) {
      const sowDate = new Date(plans.find((pl) => pl.id === selectedPlanId)!.sowDate);
      const daysSinceSow = Math.floor((new Date(lastRecord.date).getTime() - sowDate.getTime()) / (1000 * 60 * 60 * 24));
      const progress = daysSinceSow / plant.maturityDays;
      if (progress > 0.85) return { text: '接近成熟', color: '#10B981' };
    }

    if (recent.length >= 2) {
      const avgGrowth = recent.slice(1).reduce((sum, r, i) => sum + (r.height - recent[i].height), 0) / (recent.length - 1);
      if (avgGrowth < 2) return { text: '生长缓慢', color: '#F59E0B' };
    }
    return { text: '生长正常', color: '#10B981' };
  }, [records, plants, plans, selectedPlanId]);

  const handleSubmit = async () => {
    if (!selectedPlanId) return;
    await recordApi.create(selectedPlanId, {
      date: formData.date,
      photoUrl: formData.photoUrl,
      height: Number(formData.height) || 0,
      leafCount: Number(formData.leafCount) || 0,
      note: formData.note,
    });
    const updated = await recordApi.list(selectedPlanId);
    setRecords(updated);
    setFormData({ date: new Date().toISOString().split('T')[0], photoUrl: '', height: '', leafCount: '', note: '' });
    setShowForm(false);
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #D1D5DB',
            fontSize: '14px',
            minWidth: '200px',
            background: '#fff',
          }}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.plantName}（播种: {p.sowDate}）
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#065F46',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {showForm ? '取消' : '+ 记录生长'}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>日期</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>高度(cm)</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData((f) => ({ ...f, height: e.target.value }))}
              placeholder="如：25"
              style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>叶片数</label>
            <input
              type="number"
              value={formData.leafCount}
              onChange={(e) => setFormData((f) => ({ ...f, leafCount: e.target.value }))}
              placeholder="如：8"
              style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>照片URL</label>
            <input
              value={formData.photoUrl}
              onChange={(e) => setFormData((f) => ({ ...f, photoUrl: e.target.value }))}
              placeholder="可选"
              style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>备注</label>
            <input
              value={formData.note}
              onChange={(e) => setFormData((f) => ({ ...f, note: e.target.value }))}
              placeholder="如：开始分枝"
              style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#10B981',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              height: '38px',
            }}
          >
            提交
          </button>
        </div>
      )}

      {chartData.length >= 2 && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#065F46', marginBottom: '12px' }}>
            生长曲线
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} width={36} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="height"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 4, fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: trendText.color }}>
            {trendText.text}
          </div>
        </div>
      )}

      {selectedPlan && (
        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
          播种日期：{selectedPlan.sowDate} · 盆数：{selectedPlan.pots}
        </div>
      )}

      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        <div
          style={{
            position: 'absolute',
            left: '8px',
            top: '0',
            bottom: '0',
            width: '2px',
            background: '#D1D5DB',
          }}
        />

        {records.length === 0 ? (
          <div style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
            暂无生长记录，点击上方"记录生长"开始记录
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              style={{
                position: 'relative',
                marginBottom: '16px',
                minHeight: '140px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '12px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#10B981',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 0 2px #10B981',
                }}
              />
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                }}
              >
                {record.photoUrl && (
                  <img
                    src={record.photoUrl}
                    alt="生长照片"
                    style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#065F46', marginBottom: '6px' }}>
                    {record.date}
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
                    高度：{record.height}cm · 叶片：{record.leafCount}片
                  </div>
                  {record.note && (
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                      {record.note}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await recordApi.delete(record.id);
                    if (selectedPlanId) {
                      const updated = await recordApi.list(selectedPlanId);
                      setRecords(updated);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GrowthTimeline;
