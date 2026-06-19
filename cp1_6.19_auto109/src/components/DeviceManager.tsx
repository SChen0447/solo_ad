import { useState } from 'react'
import { useEnergyStore } from '@/store/useEnergyStore'
import { Device, CHART_COLORS } from '@/data/devices'
import { Plus, Pencil, Trash2, X, Zap, Clock } from 'lucide-react'

interface FormData {
  name: string
  power: string
  dailyHours: string
}

const emptyForm: FormData = { name: '', power: '', dailyHours: '' }

export default function DeviceManager() {
  const { devices, addDevice, updateDevice, deleteDevice } = useEnergyStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (device: Device) => {
    setEditingId(device.id)
    setForm({ name: device.name, power: String(device.power), dailyHours: String(device.dailyHours) })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    const power = Number(form.power)
    const dailyHours = Number(form.dailyHours)
    if (!name || power <= 0 || dailyHours <= 0) return
    if (editingId) {
      updateDevice(editingId, { name, power, dailyHours })
    } else {
      addDevice(name, power, dailyHours)
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    deleteDevice(id)
    setDeleteConfirmId(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-sm-text">设备管理</h2>
        <button onClick={openAdd} className="btn-action flex items-center gap-1">
          <Plus size={16} /> 添加设备
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device, index) => (
          <div
            key={device.id}
            className="card animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: CHART_COLORS[index % 10] }}
            />
            <div className="pt-3">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-sm-text">{device.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(device)}
                    className="p-1.5 rounded-md hover:bg-sm-secondary/20 text-sm-text-muted hover:text-sm-accent transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(device.id)}
                    className="p-1.5 rounded-md hover:bg-sm-secondary/20 text-sm-text-muted hover:text-sm-action transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-sm-text-muted">
                  <Zap size={13} className="text-sm-accent" />
                  <span>{device.power}W</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm-text-muted">
                  <Clock size={13} className="text-sm-accent" />
                  <span>{device.dailyHours}h/天</span>
                </div>
                <div className="text-sm-text-muted">
                  日耗 <span className="text-sm-text font-medium">{device.dailyKWh}</span> kWh
                </div>
                <div className="text-sm-text-muted">
                  月耗 <span className="text-sm-text font-medium">{device.monthlyKWh}</span> kWh
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmId(null)}>
          <div className="card p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm-text mb-4">确定要删除此设备吗？</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-1.5 rounded-md text-sm-text-muted hover:bg-sm-secondary/20 transition-colors">
                取消
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-1.5 rounded-md bg-sm-action text-white hover:bg-sm-action-hover transition-colors">
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="card p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-sm-text">{editingId ? '编辑设备' : '添加设备'}</h3>
              <button onClick={closeModal} className="p-1 rounded-md hover:bg-sm-secondary/20 text-sm-text-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-sm-text-muted mb-1">设备名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="如：空调"
                />
              </div>
              <div>
                <label className="block text-sm text-sm-text-muted mb-1">额定功率W</label>
                <input
                  type="number"
                  value={form.power}
                  onChange={(e) => setForm({ ...form, power: e.target.value })}
                  className="input-field w-full"
                  placeholder="如：1500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-sm-text-muted mb-1">日均使用时长h</label>
                <input
                  type="number"
                  value={form.dailyHours}
                  onChange={(e) => setForm({ ...form, dailyHours: e.target.value })}
                  className="input-field w-full"
                  placeholder="如：8"
                  min="0.1"
                  step="0.1"
                />
              </div>
              <button type="submit" className="btn-action w-full mt-2">
                {editingId ? '保存修改' : '添加设备'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
