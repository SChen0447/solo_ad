import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAnimationStore } from '@/store/useAnimationStore';
import { EASING_OPTIONS } from '@/types';
import type { AnimationSlice, TransformGroup } from '@/types';
import { cn } from '@/lib/utils';
import SliderInput from './SliderInput';

interface CardProps {
  title: string;
  bg: string;
  children: React.ReactNode;
}

function Card({ title, bg, children }: CardProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn('rounded-lg', bg)}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1 w-full px-3 py-2 text-sm font-medium text-gray-700">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-gray-600">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-6 border border-gray-200 rounded cursor-pointer" />
      <span className="text-xs font-[JetBrains_Mono] text-gray-500">{value}</span>
    </div>
  );
}

const TRANSFORM_FIELDS: { key: keyof TransformGroup; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'translateX', label: 'X 偏移', min: -500, max: 500, step: 1, unit: 'px' },
  { key: 'translateY', label: 'Y 偏移', min: -500, max: 500, step: 1, unit: 'px' },
  { key: 'rotate', label: '旋转', min: -360, max: 360, step: 1, unit: 'deg' },
  { key: 'scale', label: '缩放', min: 0, max: 3, step: 0.1, unit: '' },
  { key: 'skewX', label: 'X 倾斜', min: -90, max: 90, step: 1, unit: 'deg' },
  { key: 'skewY', label: 'Y 倾斜', min: -90, max: 90, step: 1, unit: 'deg' },
];

export default function PropertyPanel() {
  const { slices, selectedSliceId, updateSlice } = useAnimationStore();
  const slice = slices.find(s => s.id === selectedSliceId) as AnimationSlice | undefined;

  if (!slice) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        请选择一个动画切片
      </div>
    );
  }

  const set = <K extends keyof AnimationSlice>(key: K, value: AnimationSlice[K]) =>
    updateSlice(slice.id, { [key]: value });

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-16 shrink-0 text-gray-600">选择器</span>
          <input value={slice.selector} onChange={e => set('selector', e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded font-[JetBrains_Mono] focus:outline-none focus:border-[#00D4AA]" />
        </div>
        <SliderInput label="开始时间" value={slice.startTime} min={0} max={10000} step={100} unit="ms" onChange={v => set('startTime', v)} />
        <SliderInput label="持续时间" value={slice.duration} min={0} max={10000} step={100} unit="ms" onChange={v => set('duration', v)} />
        <SliderInput label="延迟" value={slice.delay} min={0} max={5000} step={50} unit="ms" onChange={v => set('delay', v)} />
        <div className="flex items-center gap-2 text-sm">
          <span className="w-16 shrink-0 text-gray-600">缓动</span>
          <select value={slice.easing} onChange={e => set('easing', e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[#00D4AA]">
            {EASING_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <Card title="变换" bg="bg-blue-50/80">
        {TRANSFORM_FIELDS.map(f => (
          <SliderInput key={f.key} label={f.label} value={slice.transform[f.key]} min={f.min} max={f.max} step={f.step} unit={f.unit}
            onChange={v => updateSlice(slice.id, { transform: { ...slice.transform, [f.key]: v } })} />
        ))}
      </Card>

      <Card title="透明度" bg="bg-purple-50/80">
        <SliderInput label="透明度" value={slice.opacity} min={0} max={1} step={0.01}
          onChange={v => set('opacity', v)} />
      </Card>

      <Card title="颜色" bg="bg-amber-50/80">
        <ColorPicker label="起始色" value={slice.color.startColor} onChange={v => updateSlice(slice.id, { color: { ...slice.color, startColor: v } })} />
        <ColorPicker label="结束色" value={slice.color.endColor} onChange={v => updateSlice(slice.id, { color: { ...slice.color, endColor: v } })} />
      </Card>
    </div>
  );
}
