import { useRef, useEffect, useMemo, MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Stroke } from './App'

interface CoffeeCupProps {
  strokes: Stroke[]
  selectedColor: string
  brushSize: number
  onStrokeStart: (stroke: Stroke) => void
  onStrokeMove: (point: { x: number; y: number }) => void
  onStrokeEnd: () => void
  textureCanvasRef: MutableRefObject<HTMLCanvasElement | null>
}

const EASE_IN_DURATION = 100
const SPREAD_DURATION = 500
const SPREAD_FACTOR = 0.2

function CoffeeCupContent({
  strokes,
  selectedColor,
  brushSize,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  textureCanvasRef,
}: CoffeeCupProps) {
  const liquidMeshRef = useRef<THREE.Mesh>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const isDrawing = useRef(false)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)
  const lastStrokeCountRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const { camera, gl } = useThree()

  const liquidTexture = useMemo