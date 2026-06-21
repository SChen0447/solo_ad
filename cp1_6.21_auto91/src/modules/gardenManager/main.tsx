import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  ArrowLeft,
  Calendar,
  Droplets,
  MapPin,
  Sprout,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import PlotCard from './components/PlotCard';
import {
  Plot,
  PlantingRecord,
  Crop,
  RotationValidation,
  YieldPrediction,
  SOIL_NAMES,
  FAMILY_COLORS,
  FAMILY_NAMES,
} from '@/types';

const GardenManager: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<(Plot & { records: PlantingRecord[] }) | null>(null);
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreatePlot, setShowCreatePlot] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [validation, setValidation] = useState<RotationValidation | null>(null);

  const [newPlot, setNewPlot] = useState({
    name: '',
    area: '',
    orientation: '',
    soilType: 'loam' as 'sandy' | 'loam' | 'clay',
  });

  const [newRecord, setNewRecord] = useState({
    cropName: '',
    plantingDate: '',
    expectedHarvestDate: '',
    actualHarvestDate: '',
    yield: '',
    notes: '',
  });

  useEffect(() => {
    fetchPlots();
    fetchCrops();
  }, []);

  useEffect(() => {
    if (id) {
      fetchPlotDetail(id);
      fetchPrediction(id);
    } else {
      setSelectedPlot(null);
      setPrediction(null);
    }
  }, [id]);

  const fetchPlots = async () => {
    try {
      const res = await fetch('/api/plots');
      const data = await res.json();
      setPlots(data);
    } catch (error) {
      console.error('Failed to fetch plots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrops = async () => {
    try {
      const res = await fetch('/api/crops');
      const data = await res.json();
      setCrops(data);
    } catch (error) {
      console.error('Failed to fetch crops:', error);
    }
  };

  const fetchPlotDetail = async (plotId: string) => {
    try {
      const res = await fetch(`/api/plots/${plotId}`);
      const data = await res.json();
      setSelectedPlot(data);
    } catch (error) {
      console.error('Failed to fetch plot detail:', error);
    }
  };

  const fetchPrediction = async (plotId: string) => {
    try {
      const res = await fetch(`/api/plots/${plotId}/prediction`);
      const data = await res.json();
      setPrediction(data);
    } catch (error) {
      console.error('Failed to fetch prediction:', error);
    }
  };

  const validateRotation = async (plotId: string, cropName: string) => {
    if (!cropName) {
      setValidation(null);
      return;
    }
    try {
      const res = await fetch('/api/rotation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotId, cropName }),
      });
      const data = await res.json();
      setValidation(data);
    } catch (error) {
      console.error('Failed to validate rotation:', error);
    }
  };

  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlot.name,
          area: parseFloat(newPlot.area),
          orientation: newPlot.orientation,
          soilType: newPlot.soilType,
        }),
      });
      if (res.ok) {
        setShowCreatePlot(false);
        setNewPlot({ name: '', area: '', orientation: '', soilType: 'loam' });
        fetchPlots();
      }
    } catch (error) {
      console.error('Failed to create plot:', error);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !validation?.valid) return;

    try {
      const res = await fetch(`/api/plots/${id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: newRecord.cropName,
          plantingDate: newRecord.plantingDate,
          expectedHarvestDate: newRecord.expectedHarvestDate,
          actualHarvestDate: newRecord.actualHarvestDate || null,
          yield: newRecord.yield ? parseFloat(newRecord.yield) : null,
          notes: newRecord.notes || null,
        }),
      });
      if (res.ok) {
        setShowAddRecord(false);
        setNewRecord({
          cropName: '',
          plantingDate: '',
          expectedHarvestDate: '',
          actualHarvestDate: '',
          yield: '',
          notes: '',
        });
        setValidation(null);
        fetchPlots();
        fetchPlotDetail(id);
        fetchPrediction(id);
      }
    } catch (error) {
      console.error('Failed to add record:', error);
    }
  };

  const handleDeletePlot = async (plotId: string) => {
    if (!confirm('确定要删除这个地块吗？')) return;
    try {
      await fetch(`/api/plots/${plotId}`, { method: 'DELETE' });
      navigate('/');
      fetchPlots();
    } catch (error) {
      console.error('Failed to delete plot:', error);
    }
  };

  const handleHarvestRecord = async (record: PlantingRecord) => {
    if (!id) return;
    const today = new Date().toISOString().split('T')[0];
    const yieldInput = prompt('请输入实际产量（千克）：');
    if (yieldInput === null) return;

    try {
      await fetch(`/api/plots/${id}/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualHarvestDate: today,
          yield: parseFloat(yieldInput) || 0,
        }),
      });
      fetchPlots();
      fetchPlotDetail(id);
      fetchPrediction(id);
    } catch (error) {
      console.error('Failed to update record:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  if (id && selectedPlot) {
    const daysToHarvest = prediction?.bestHarvestWindow.start
      ? Math.ceil(
          (new Date(prediction.bestHarvestWindow.start).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return (
      <div className="p-6 fade-in">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 btn-transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回地块列表</span>
          </button>
          <button
            onClick={() => handleDeletePlot(id)}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 btn-transition"
          >
            <Trash2 className="w-5 h-5" />
            <span>删除地块</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#FFFDE7] rounded-xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-800">{selectedPlot.name}</h1>
                <button
                  onClick={() => setShowAddRecord(true)}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg btn-transition hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                  添加种植记录
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span>面积：{selectedPlot.area} ㎡</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-green-600" />
                  <span>朝向：{selectedPlot.orientation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-green-600" />
                  <span>土壤：{SOIL_NAMES[selectedPlot.soilType]}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFDE7] rounded-xl p-6 shadow-md">
              <h2 className="text-xl font-bold text-gray-800 mb-6">种植历史</h2>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-green-200" />
                {selectedPlot.records.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无种植记录，点击上方按钮添加
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedPlot.records.map((record, index) => (
                      <div key={record.id} className="relative pl-14 fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div
                          className="absolute left-4 w-4 h-4 rounded-full border-4 border-white shadow-md"
                          style={{ backgroundColor: FAMILY_COLORS[record.family] || '#999' }}
                        />
                        <div
                          className="bg-white rounded-xl p-4 shadow-sm border-l-4"
                          style={{ borderLeftColor: FAMILY_COLORS[record.family] || '#999' }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-800">{record.cropName}</h3>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: FAMILY_COLORS[record.family] || '#999' }}
                              >
                                {FAMILY_NAMES[record.family] || record.family}
                              </span>
                            </div>
                            {!record.actualHarvestDate && (
                              <button
                                onClick={() => handleHarvestRecord(record)}
                                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 btn-transition"
                              >
                                <CheckCircle className="w-4 h-4" />
                                标记收获
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>种植：{record.plantingDate}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>预计收获：{record.expectedHarvestDate}</span>
                            </div>
                            {record.actualHarvestDate && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>实际收获：{record.actualHarvestDate}</span>
                              </div>
                            )}
                            {record.yield !== null && record.yield !== undefined && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                                <span>产量：{record.yield} kg</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span>周期：{record.cycleDays} 天</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-purple-500" />
                              <span>闲置：{record.idleDays} 天</span>
                            </div>
                          </div>
                          {record.notes && (
                            <p className="mt-2 text-sm text-gray-500 border-t pt-2">备注：{record.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#FFFDE7] rounded-xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-gray-800 mb-4">收成预测</h3>
              {prediction && prediction.dailyTrend.length > 0 ? (
                <>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-1">预期产量区间</div>
                    <div className="text-2xl font-bold text-green-600">
                      {prediction.expectedMin} - {prediction.expectedMax} kg
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-1">最佳收获窗口期</div>
                    <div className="text-lg font-semibold text-amber-600">
                      {prediction.bestHarvestWindow.start} ~ {prediction.bestHarvestWindow.end}
                    </div>
                    {daysToHarvest !== null && daysToHarvest > 0 && (
                      <div className="text-sm text-orange-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        倒计时：{daysToHarvest} 天
                      </div>
                    )}
                  </div>
                  <div className="h-48 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prediction.dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="yield"
                          stroke="#4CAF50"
                          strokeWidth={2}
                          dot={{ fill: '#4CAF50' }}
                          name="预估产量 (kg)"
                          animationDuration={500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center text-gray-500 mt-1">每日预估产量趋势</p>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prediction.historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
                        <XAxis dataKey="month" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={40} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar
                          dataKey="avgYield"
                          fill="#8D6E63"
                          name="历史平均产量 (kg)"
                          animationDuration={500}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center text-gray-500 mt-1">近12个月历史同期数据</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无当前种植作物，无法预测
                </div>
              )}
            </div>
          </div>
        </div>

        {showAddRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md fade-in">
              <h3 className="text-xl font-bold text-gray-800 mb-4">添加种植记录</h3>
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
                  <select
                    value={newRecord.cropName}
                    onChange={(e) => {
                      setNewRecord({ ...newRecord, cropName: e.target.value });
                      validateRotation(id, e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                    required
                  >
                    <option value="">请选择作物</option>
                    {crops.map((crop) => (
                      <option key={crop.name} value={crop.name}>
                        {crop.name} ({FAMILY_NAMES[crop.family] || crop.family})
                      </option>
                    ))}
                  </select>
                  {validation && (
                    <div
                      className={`mt-2 p-3 rounded-lg text-sm flex items-start gap-2 ${
                        validation.valid
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {validation.valid ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{validation.message}</p>
                        {validation.recommendations.length > 0 && (
                          <ul className="mt-1 space-y-1">
                            {validation.recommendations.map((rec, i) => (
                              <li key={i} className="text-xs">• {rec}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">种植日期</label>
                  <input
                    type="date"
                    value={newRecord.plantingDate}
                    onChange={(e) => setNewRecord({ ...newRecord, plantingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">预计收获日期</label>
                  <input
                    type="date"
                    value={newRecord.expectedHarvestDate}
                    onChange={(e) => setNewRecord({ ...newRecord, expectedHarvestDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">实际收获日期（可选）</label>
                  <input
                    type="date"
                    value={newRecord.actualHarvestDate}
                    onChange={(e) => setNewRecord({ ...newRecord, actualHarvestDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">产量（千克，可选）</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRecord.yield}
                    onChange={(e) => setNewRecord({ ...newRecord, yield: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                    placeholder="请输入产量"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
                  <textarea
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                    rows={2}
                    placeholder="添加备注信息"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRecord(false);
                      setValidation(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 btn-transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!validation?.valid}
                    className={`flex-1 px-4 py-2 rounded-lg text-white btn-transition ${
                      validation?.valid
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    添加记录
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">地块管理</h1>
          <p className="text-gray-600 mt-1">管理所有地块和种植记录</p>
        </div>
        <button
          onClick={() => setShowCreatePlot(true)}
          className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl btn-transition hover:bg-green-600 shadow-md"
        >
          <Plus className="w-5 h-5" />
          新建地块
        </button>
      </div>

      {plots.length === 0 ? (
        <div className="bg-[#FFFDE7] rounded-xl p-12 text-center shadow-md">
          <Sprout className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无地块</h3>
          <p className="text-gray-500 mb-4">点击上方按钮创建您的第一个地块</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {plots.map((plot, index) => (
            <div key={plot.id} className="fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <PlotCard plot={plot} onClick={() => navigate(`/plot/${plot.id}`)} />
            </div>
          ))}
        </div>
      )}

      {showCreatePlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">新建地块</h3>
            <form onSubmit={handleCreatePlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地块名称</label>
                <input
                  type="text"
                  value={newPlot.name}
                  onChange={(e) => setNewPlot({ ...newPlot, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                  placeholder="如：东一号地块"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">面积（㎡）</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPlot.area}
                    onChange={(e) => setNewPlot({ ...newPlot, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                    placeholder="50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">朝向</label>
                  <input
                    type="text"
                    value={newPlot.orientation}
                    onChange={(e) => setNewPlot({ ...newPlot, orientation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                    placeholder="如：南向"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">土壤类型</label>
                <select
                  value={newPlot.soilType}
                  onChange={(e) => setNewPlot({ ...newPlot, soilType: e.target.value as 'sandy' | 'loam' | 'clay' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"
                >
                  <option value="sandy">沙土</option>
                  <option value="loam">壤土</option>
                  <option value="clay">黏土</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePlot(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 btn-transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 btn-transition"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GardenManager;
