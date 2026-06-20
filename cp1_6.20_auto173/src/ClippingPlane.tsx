import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { BuildingData } from './types'

interface ClippingPlaneProps {
  clippingY: number
  buildingData: BuildingData
}

export function ClippingPlane({ clippingY, buildingData }: ClippingPlaneProps) {
  const { gl } = useThree()

  const clippingPlane = useMemo(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), clippingY)
    gl.localClippingEnabled = true
    return plane
  }, [gl, clippingY])

  const lineMesh = useMemo(() => {
    const halfW = buildingData.buildingWidth / 2 + 0.5
    const halfD = buildingData.buildingDepth / 2 + 0.5
    const points = [
      new THREE.Vector3(-halfW, 0, -halfD),
      new THREE.Vector3(halfW, 0, -halfD),
      new THREE.Vector3(halfW, 0, halfD),
      new THREE.Vector3(-halfW, 0, halfD),
      new THREE.Vector3(-halfW, 0, -halfD),
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color('#00BFFF'),
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    })
    const line = new THREE.Line(geometry, material)
    line.position.y = clippingY
    line.renderOrder = 999
    return line
  }, [buildingData.buildingWidth, buildingData.buildingDepth])

  useFrame(() => {
    clippingPlane.constant = clippingY
    lineMesh.position.y = clippingY
  })

  return (
    <>
      <primitive object={clippingPlane} attach="clippingPlanes" />
      <primitive object={lineMesh} />
    </>
  )
}
