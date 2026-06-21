import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWeekend,
  getDay
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Calendar as CalendarIcon,
  AlertTriangle
} from 'lucide-react'
import {
  Shift,
  ShiftType,
  Employee,
  SHIFT_INFO,
  shiftApi,
  employeeApi
} from '../api/requests'
import { ShiftBlock } from './ShiftBlock'

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']

interface DragState {
  isDragging: boolean
  shift: Shift | null
  shiftType: ShiftType | null
  employeeId: string
  employeeName: string
  sourceDate: string | null
  sourceShiftId: string | null
}

export function ShiftCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    shift: null,
    shiftType: null,
    employeeId: '',
    employeeName: '',
    sourceDate: null,
    sourceShiftId: null
  })
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [conflictDates, setConflictDates] = useState<Set<string>>(new Set())
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createDate, setCreateDate] = useState<string>('')
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    shiftType: 'morning' as ShiftType,
    note: ''
  })
  const conflictFlashRef = useRef<Record<string, number>>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [s, e] = await Promise.all([shiftApi.getAll(), employeeApi.getAll()])
      setShifts(s)
      setEmployees(e)
      if (e.length > 0) {
        setFormData(prev => ({
          ...prev,
          employeeId: e[0].id,
          employeeName: e[0].name
        }))
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const days: Date[] = []
    let d = calStart
    while (d <= calEnd) {
      days.push(d)
      d = addDays(d, 1)
    }
    return days
  }, [currentMonth])

  function getShiftsByDate(dateStr: string): Shift[] {
    return shifts.filter(s => s.date === dateStr)
  }

  function checkConflict(dateStr: string, shiftType: ShiftType, excludeShiftId?: string): boolean {
    return shifts.some(
      s => s.date === dateStr && s.shiftType === shiftType && s.id !== excludeShiftId
    )
  }

  function flashConflict(dateStr: string) {
    const now = Date.now()
    conflictFlashRef.current[dateStr] = now
    setConflictDates(prev => new Set(prev).add(dateStr))
    setTimeout(() => {
      if (conflictFlashRef.current[dateStr] === now) {
        setConflictDates(prev => {
          const next = new Set(prev)
          next.delete(dateStr)
          return next
        })
      }
    }, 900)
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault()
    if (!dragState.isDragging) return
    setHoverDate(dateStr)
  }

  function handleDragLeave() {
    setHoverDate(null)
  }

  async function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault()
    setHoverDate(null)

    if (!dragState.isDragging) return

    const targetShiftType = dragState.shiftType!

    if (checkConflict(dateStr, targetShiftType, dragState.sourceShiftId || undefined)) {
      flashConflict(dateStr)
      resetDrag()
      return
    }

    try {
      if (dragState.sourceShiftId) {
        const existing = shifts.find(s => s.id === dragState.sourceShiftId)
        if (existing) {
          const updated = await shiftApi.update(dragState.sourceShiftId, {
            employeeId: existing.employeeId,
            employeeName: existing.employeeName,
            shiftType: targetShiftType,
            date: dateStr,
            note: existing.note
          })
          setShifts(prev => prev.map(s => (s.id === updated.id ? updated : s)))
        }
      } else {
        const newShift = await shiftApi.create({
          employeeId: dragState.employeeId,
          employeeName: dragState.employeeName,
          shiftType: targetShiftType,
          date: dateStr
        })
        setShifts(prev => [...prev, newShift])
      }
    } catch (err) {
      console.error('Drop failed:', err)
    }
    resetDrag()
  }

  function resetDrag() {
    setDragState({
      isDragging: false,
      shift: null,
      shiftType: null,
      employeeId: '',
      employeeName: '',
      sourceDate: null,
      sourceShiftId: null
    })
    setHoverDate(null)
  }

  function startDragNew(type: ShiftType) {
    if (!formData.employeeId || employees.length === 0) return
    setDragState({
      isDragging: true,
      shift: null,
      shiftType: type,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      sourceDate: null,
      sourceShiftId: null
    })
  }

  function startDragExisting(e: React.DragEvent, shift: Shift) {
    e.dataTransfer.effectAllowed = 'move'
    setDragState({
      isDragging: true,
      shift,
      shiftType: shift.shiftType,
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      sourceDate: shift.date,
      sourceShiftId: shift.id
    })
  }

  function openEdit(shift: Shift) {
    setEditingShift(shift)
    setFormData({
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      shiftType: shift.shiftType,
      note: shift.note || ''
    })
  }

  function openCreate(dateStr: string) {
    setCreateDate(dateStr)
    setIsCreating(true)
    if (employees.length > 0 && !formData.employeeId) {
      setFormData(prev => ({
        ...prev,
        employeeId: employees[0].id,
        employeeName: employees[0].name
      }))
    }
  }

  async function handleSave() {
    try {
      if (editingShift) {
        const updated = await shiftApi.update(editingShift.id, {
          ...formData
        })
        setShifts(prev => prev.map(s => (s.id === updated.id ? updated : s)))
        setEditingShift(null)
      } else if (isCreating) {
        if (checkConflict(createDate, formData.shiftType)) {
          flashConflict(createDate)
          return
        }
        const created = await shiftApi.create({
          ...formData,
          date: createDate
        })
        setShifts(prev => [...prev, created])
        setIsCreating(false)
      }
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  async function handleDelete() {
    if (!editingShift) return
    try {
      await shiftApi.remove(editingShift.id)
      setShifts(prev => prev.filter(s => s.id !== editingShift.id))
      setEditingShift(null)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const previewShift: Shift | null =
    dragState.isDragging && hoverDate
      ? {
          id: 'preview',
          employeeId: dragState.employeeId,
          employeeName: dragState.employeeName,
          shiftType: dragState.shiftType!,
          date: hoverDate
        }
      : null

  const isHoverConflict =
    previewShift && hoverDate
      ? checkConflict(hoverDate, previewShift.shiftType, dragState.sourceShiftId || undefined)
      : false

  return (
    <div style={{ width: '100%' }}>
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE8EE 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(232, 160, 191, 0.35)',
          boxShadow: '0 4px 16px rgba(232, 160, 191, 0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarIcon size={22} color="#D48AA6" />
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{
              background: '#fff',
              border: '1.5px solid #E8A0BF',
              borderRadius: '10px',
              padding: '6px 10px',
              cursor: 'pointer',
              color: '#D48AA6',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={18} />
          </motion.button>
          <h2
            style={{
              margin: 0,
              fontSize: '19px',
              fontWeight: 700,
              color: '#8B4A6B',
              minWidth: '140px',
              textAlign: 'center'
            }}
          >
            {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
          </h2>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{
              background: '#fff',
              border: '1.5px solid #E8A0BF',
              borderRadius: '10px',
              padding: '6px 10px',
              cursor: 'pointer',
              color: '#D48AA6',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={18} />
          </motion.button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={formData.employeeId}
            onChange={e => {
              const emp = employees.find(x => x.id === e.target.value)
              setFormData(prev => ({
                ...prev,
                employeeId: e.target.value,
                employeeName: emp?.name || ''
              }))
            }}
            style={{
              padding: '7px 12px',
              borderRadius: '10px',
              border: '1.5px solid #E8A0BF',
              background: '#fff',
              fontSize: '13px',
              color: '#6B3A55',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                👤 {emp.name}
              </option>
            ))}
          </select>
          {(['morning', 'afternoon', 'evening'] as ShiftType[]).map(type => {
            const info = SHIFT_INFO[type]
            return (
              <motion.button
                key={type}
                draggable
                onDragStart={() => startDragNew(type)}
                onDragEnd={resetDrag}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => {}}
                style={{
                  background: info.bgColor,
                  color: '#fff',
                  border: `1.5px solid ${info.color}`,
                  borderRadius: '10px',
                  padding: '7px 14px',
                  cursor: 'grab',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                }}
              >
                <Plus size={14} />
                {info.label}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          background: 'rgba(232, 160, 191, 0.2)',
          borderRadius: '16px',
          padding: '2px',
          overflow: 'hidden'
        }}
      >
        {WEEK_DAYS.map((day, i) => (
          <div
            key={day}
            style={{
              padding: '10px 8px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '13px',
              color: i === 0 || i === 6 ? '#D48AA6' : '#8B4A6B',
              background: '#FFF5E6',
              borderBottom: '1px solid rgba(232, 160, 191, 0.25)'
            }}
          >
            {day}
          </div>
        ))}

        {calendarDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayShifts = getShiftsByDate(dateStr)
          const inMonth = isSameMonth(day, currentMonth)
          const isToday = isSameDay(day, new Date())
          const weekend = isWeekend(day)
          const isHover = hoverDate === dateStr
          const hasConflict = conflictDates.has(dateStr)
          const showingConflict = isHover && isHoverConflict

          const bgGradient = weekend
            ? 'linear-gradient(160deg, #FFF8DC 0%, #FFE4B5 60%, #FFDAB9 100%)'
            : 'linear-gradient(160deg, #F8F8F8 0%, #FCFCFC 50%, #FFFFFF 100%)'

          return (
            <motion.div
              key={dateStr}
              onDragOver={e => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, dateStr)}
              onClick={() => openCreate(dateStr)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                minHeight: '130px',
                padding: '8px 8px 6px',
                background: bgGradient,
                opacity: inMonth ? 1 : 0.4,
                cursor: 'pointer',
                position: 'relative',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                boxShadow: isHover
                  ? showingConflict
                    ? 'inset 0 0 0 2.5px rgba(255, 70, 70, 0.7), 0 0 18px rgba(255, 70, 70, 0.3)'
                    : 'inset 0 0 0 2.5px rgba(232, 160, 191, 0.55), 0 0 14px rgba(232, 160, 191, 0.2)'
                  : hasConflict
                  ? 'inset 0 0 0 2.5px rgba(255, 70, 70, 0.85)'
                  : isToday
                  ? 'inset 0 0 0 2px rgba(232, 160, 191, 0.7)'
                  : 'none',
                animation: hasConflict ? 'flashRed 0.3s ease-in-out 3' : undefined
              }}
            >
              <style>{`
                @keyframes flashRed {
                  0%, 100% { box-shadow: inset 0 0 0 2.5px rgba(255, 70, 70, 0.85); }
                  50% { box-shadow: inset 0 0 0 2.5px rgba(255, 70, 70, 0.2), 0 0 14px rgba(255,70,70,0.35); }
                }
              `}</style>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}
              >
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: isToday ? '#fff' : weekend ? '#D97706' : '#6B7280',
                    background: isToday
                      ? 'linear-gradient(135deg, #E8A0BF, #D48AA6)'
                      : 'transparent',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  {format(day, 'd')}
                </span>
                {getDay(day) === 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      background: 'rgba(232, 160, 191, 0.25)',
                      color: '#C26A92',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}
                  >
                    休
                  </span>
                )}
              </div>

              <div>
                {dayShifts.map(shift => (
                  <ShiftBlock
                    key={shift.id}
                    shift={shift}
                    onClick={() => openEdit(shift)}
                    onDragStart={e => startDragExisting(e, shift)}
                    onDragEnd={resetDrag}
                    isDragging={dragState.sourceShiftId === shift.id}
                  />
                ))}
                {previewShift && isHover && !dragState.sourceShiftId && (
                  <ShiftBlock shift={previewShift} onClick={() => {}} isPreview />
                )}
              </div>

              {showingConflict && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    right: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: 'rgba(255, 70, 70, 0.92)',
                    color: '#fff',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(255,70,70,0.35)'
                  }}
                >
                  <AlertTriangle size={12} />
                  时间冲突
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {(editingShift || isCreating) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(80, 40, 60, 0.45)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '16px'
            }}
            onClick={() => {
              setEditingShift(null)
              setIsCreating(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(160deg, #FFF5E6 0%, #FFE8EE 100%)',
                borderRadius: '20px',
                padding: '24px 26px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
                border: '1.5px solid rgba(232, 160, 191, 0.4)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px'
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#8B4A6B'
                  }}
                >
                  {editingShift ? '✏️ 编辑班次' : `➕ 新建班次 (${createDate})`}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    setEditingShift(null)
                    setIsCreating(false)
                  }}
                  style={{
                    background: 'rgba(232, 160, 191, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#8B4A6B',
                    display: 'flex'
                  }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#8B4A6B',
                      marginBottom: '6px'
                    }}
                  >
                    👤 员工
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={e => {
                      const emp = employees.find(x => x.id === e.target.value)
                      setFormData(prev => ({
                        ...prev,
                        employeeId: e.target.value,
                        employeeName: emp?.name || ''
                      }))
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(232, 160, 191, 0.45)',
                      background: '#fff',
                      fontSize: '14px',
                      color: '#6B3A55',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#8B4A6B',
                      marginBottom: '6px'
                    }}
                  >
                    🕐 班次类型
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['morning', 'afternoon', 'evening'] as ShiftType[]).map(type => {
                      const info = SHIFT_INFO[type]
                      const active = formData.shiftType === type
                      return (
                        <motion.button
                          key={type}
                          type="button"
                          whileHover={{ scale: active ? 1 : 1.03 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setFormData(prev => ({ ...prev, shiftType: type }))}
                          style={{
                            flex: 1,
                            padding: '10px 6px',
                            borderRadius: '12px',
                            border: active ? `2px solid ${info.color}` : '1.5px solid rgba(232, 160, 191, 0.3)',
                            background: active ? info.bgColor : '#fff',
                            color: active ? '#fff' : '#6B3A55',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: active ? '0 4px 12px rgba(0,0,0,0.12)' : 'none'
                          }}
                        >
                          <div>{info.label}</div>
                          <div style={{ fontSize: '10.5px', opacity: 0.9, marginTop: '2px' }}>
                            {info.hours.split(' - ')[0]}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#8B4A6B',
                      marginBottom: '6px'
                    }}
                  >
                    📝 备注
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    rows={3}
                    placeholder="添加备注信息（选填）..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(232, 160, 191, 0.45)',
                      background: '#fff',
                      fontSize: '13.5px',
                      color: '#6B3A55',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '22px'
                }}
              >
                {editingShift && (
                  <motion.button
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={handleDelete}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(255, 100, 100, 0.5)',
                      background: 'rgba(255, 240, 240, 0.85)',
                      color: '#E25555',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Trash2 size={16} />
                    删除
                  </motion.button>
                )}
                <div style={{ flex: 1 }} />
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={() => {
                    setEditingShift(null)
                    setIsCreating(false)
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(232, 160, 191, 0.5)',
                    background: '#fff',
                    color: '#8B4A6B',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={handleSave}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #E8A0BF 0%, #D48AA6 100%)',
                    color: '#fff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(232, 160, 191, 0.4)'
                  }}
                >
                  💾 保存
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
