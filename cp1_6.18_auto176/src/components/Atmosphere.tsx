import { useMemo } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS } from '../types'

export function Atmosphere() {
  const atmosphereShader = useMemo(() => ({
    uniforms: {
      glowColor: { value: new THREE.Color(0x88ccff) },
      viewVector: { value: new THREE.Vector3(0, 0, 1) },
      c: { value: 0.4 },
      p: { value: 4.0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float c;
      uniform float p;
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        float intensity = pow(c - dot(vNormal, vPositionNormal), p);
        gl_FragColor = vec4(glowColor, intensity * 0.6);
      }
    `
  }), [])

  return (
    <mesh scale={[1.15, 1.15, 1.15]}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <shaderMaterial
        uniforms={atmosphereShader.uniforms}
        vertexShader={atmosphereShader.vertexShader}
        fragmentShader={atmosphereShader.fragmentShader}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  )
}
