import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, LayerType, PartInfo } from '@/store'
import { scaleLinear } from 'd3-scale'

const BODY_TOP = 5
const BODY_BOTTOM = -5
const sliceScale = scaleLinear().domain([0, 100]).range([BODY_TOP, BODY_BOTTOM])

const BONE_COLOR = '#f5f5dc'
const MUSCLE_COLOR = '#cd5c5c'
const VESSEL_COLOR = '#b22222'
const SKIN_COLOR = '#e8b89d'
const HIGHLIGHT_COLOR = '#ffdd57'

interface PartMeshProps {
  partId: string
  partType: LayerType
  partInfo: PartInfo
  children: React.ReactNode
  clipPlane: THREE.Plane | null
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent * 100)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt)
  const B = Math.min(255, (num & 0x0000ff) + amt)
  return '#' + ((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)
}

const PartMesh: React.FC<PartMeshProps> = ({ partId, partType, children, clipPlane }) => {
  const meshRefs = useRef<THREE.Mesh[]>([])
  const [hovered, setHovered] = useState(false)
  const selected = useStore((s) => s.selectedPartId === partId)
  const setSelectedPart = useStore((s) => s.setSelectedPart)

  const visible = useStore((s) =>
    partType === 'bone' ? s.boneVisible : partType === 'muscle' ? s.muscleVisible : s.vesselVisible,
  )
  const opacity = useStore((s) =>
    partType === 'bone' ? s.boneOpacity : partType === 'muscle' ? s.muscleOpacity : s.vesselOpacity,
  )
  const baseColor =
    partType === 'bone' ? BONE_COLOR : partType === 'muscle' ? MUSCLE_COLOR : VESSEL_COLOR

  const [pulseTime, setPulseTime] = useState(0)

  useFrame((_, delta) => {
    if (selected) setPulseTime((t) => (t + delta) % 0.8)
  })

  useEffect(() => {
    if (selected) setPulseTime(0)
  }, [selected])

  const pulseIntensity = selected ? 0.5 + 0.5 * Math.sin((pulseTime / 0.8) * Math.PI * 2) : 0
  const displayColor = selected ? HIGHLIGHT_COLOR : hovered ? shadeColor(baseColor, 0.15) : baseColor
  const emissiveIntensity = selected ? pulseIntensity * 0.8 : hovered ? 0.2 : 0

  const addMeshRef = useCallback((mesh: THREE.Mesh | null) => {
    if (mesh && !meshRefs.current.includes(mesh)) meshRefs.current.push(mesh)
  }, [])

  const handleClick = (e: any) => {
    e.stopPropagation()
    setSelectedPart(partId)
  }
  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }
  const handlePointerOut = (e: any) => {
    e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  if (!visible) return null
  const clippingPlanes = clipPlane ? [clipPlane] : []

  const cloneWithProps = (child: React.ReactElement, key: number): React.ReactElement => {
    if (child.type === 'mesh') {
      return React.cloneElement(child as React.ReactElement<any>, {
        key,
        ref: addMeshRef,
        onClick: handleClick,
        onPointerOver: handlePointerOver,
        onPointerOut: handlePointerOut,
        userData: { partId, partType },
        children: React.Children.toArray(child.props.children).map((c, i) => {
          const ce = c as React.ReactElement<any>
          if (ce && ce.props && ('color' in ce.props || 'emissive' in ce.props)) {
            return React.cloneElement(ce, {
              key: `mat-${i}`,
              color: displayColor,
              transparent: opacity < 1,
              opacity,
              clippingPlanes,
              clipShadows: true,
              side: THREE.DoubleSide,
              emissive: selected || hovered ? displayColor : '#000000',
              emissiveIntensity,
            })
          }
          return c
        }),
      })
    }
    if (React.Children.count(child.props.children) > 0) {
      return React.cloneElement(child as React.ReactElement<any>, {
        key,
        children: React.Children.map(child.props.children, (c, i) =>
          React.isValidElement(c) ? cloneWithProps(c, i) : c,
        ),
      })
    }
    return child
  }

  return (
    <group>
      {React.Children.map(children, (child, i) =>
        React.isValidElement(child) ? cloneWithProps(child, i) : child,
      )}
      {(selected || hovered) && (
        <group>
          {React.Children.map(children, (child, idx) => {
            if (!React.isValidElement(child) || child.type !== 'mesh') return null
            const props = child.props as any
            return React.cloneElement(child as React.ReactElement<any>, {
              key: `outline-${idx}`,
              children: [
                props.children?.[0],
                <meshBasicMaterial
                  key={`outline-mat-${idx}`}
                  color={HIGHLIGHT_COLOR}
                  wireframe={true}
                  transparent={true}
                  opacity={selected ? 0.3 + pulseIntensity * 0.4 : 0.2}
                  depthWrite={false}
                  clippingPlanes={clippingPlanes}
                  side={THREE.DoubleSide}
                />,
              ],
            })
          })}
        </group>
      )}
    </group>
  )
}

export { PartMesh, BONE_COLOR, MUSCLE_COLOR, VESSEL_COLOR, SKIN_COLOR, HIGHLIGHT_COLOR, sliceScale, shadeColor }
