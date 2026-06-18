import { useControls } from 'leva'
import { useAppStore } from '../store'

export function SliceControls() {
  const slicePlane = useAppStore((state) => state.slicePlane)
  const setSlicePlane = useAppStore((state) => state.setSlicePlane)

  useControls('剖切平面', {
    enabled: {
      value: slicePlane.enabled,
      label: '启用剖切',
      onChange: (value) => setSlicePlane({ enabled: value })
    },
    height: {
      value: slicePlane.height,
      min: 0,
      max: 10,
      step: 0.1,
      label: '海拔高度 (km)',
      onChange: (value) => setSlicePlane({ height: value })
    },
    rotationX: {
      value: slicePlane.rotationX,
      min: 0,
      max: 360,
      step: 1,
      label: 'X轴旋转 (°)',
      onChange: (value) => setSlicePlane({ rotationX: value })
    },
    rotationY: {
      value: slicePlane.rotationY,
      min: 0,
      max: 360,
      step: 1,
      label: 'Y轴旋转 (°)',
      onChange: (value) => setSlicePlane({ rotationY: value })
    }
  })

  return null
}
