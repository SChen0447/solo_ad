interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}

export default function SliderInput({ label, value, min, max, step = 1, onChange, unit }: SliderInputProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-gray-600 truncate">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00D4AA] [&::-webkit-slider-thumb]:shadow-sm accent-[#00D4AA]"
      />
      <div className="flex items-center gap-0.5">
        <input
          type="number"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-14 px-1 py-0.5 text-xs text-center border border-gray-200 rounded bg-white font-[JetBrains_Mono] focus:outline-none focus:border-[#00D4AA]"
        />
        {unit && <span className="text-[10px] text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}
