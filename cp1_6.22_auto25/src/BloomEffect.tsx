import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

interface BloomEffectProps {
  intensity?: number
  threshold?: number
  radius?: number
}

export default function BloomEffect({ 
  intensity = 0.3,
  threshold = 0.1,
  radius = 0.5
}: BloomEffectProps) {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef<EffectComposer | null>(null)

  useEffect(() => {
    const composer = new EffectComposer(gl)
    
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      intensity,
      radius,
      threshold
    )
    composer.addPass(bloomPass)

    composerRef.current = composer

    const handleResize = () => {
      composer.setSize(size.width, size.height)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      composer.dispose()
    }
  }, [gl, scene, camera, size, intensity, radius, threshold])

  useFrame(() => {
    if (composerRef.current) {
      composerRef.current.render()
    }
  }, 1)

  return null
}
