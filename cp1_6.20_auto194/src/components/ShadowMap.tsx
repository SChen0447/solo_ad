import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ShadowMapProps {
  lightRef: React.RefObject<THREE.DirectionalLight>
}

export default function ShadowMap({ lightRef }: ShadowMapProps) {
  useEffect(() => {
    if (lightRef.current) {
      const light = lightRef.current

      light.castShadow = true
      light.shadow.mapSize.width = 2048
      light.shadow.mapSize.height = 2048
      light.shadow.camera.near = 0.5
      light.shadow.camera.far = 200
      light.shadow.camera.left = -30
      light.shadow.camera.right = 30
      light.shadow.camera.top = 30
      light.shadow.camera.bottom = -30
      light.shadow.bias = -0.0005
      light.shadow.normalBias = 0.02
      light.shadow.radius = 6
    }
  }, [lightRef])

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.shadow.camera.updateProjectionMatrix()
      lightRef.current.shadow.needsUpdate = true
    }
  })

  return null
}
