import * as THREE from 'three'
import { scaleLinear } from 'd3-scale'

export interface PipeData {
  id: string
  startNode: number
  endNode: number
  curve: THREE.CatmullRomCurve3
  pressure: number
  flowRate: number
  temperature: number
  diameter: number
  tubeSegments: number
  radialSegments: number
}

export interface NodeData {
  id: number
  position: THREE.Vector3
}

const pressureColorScale = scaleLinear<string>()
  .domain([0, 25, 50, 75, 100])
  .range(['#001a4d', '#0066cc', '#cccc00', '#ff6600', '#ff0033'])
  .clamp(true)

export class PipeNetwork {
  public pipes: PipeData[] = []
  public nodes: NodeData[] = []
  public pipeMeshes: Map<string, THREE.Mesh> = new Map()
  public nodeMeshes: Map<number, THREE.Mesh> = new Map()
  public group: THREE.Group
  private highlightTargets: Map<string, { targetScale: number; startTime: number }> = new Map()
  private originalColors: Map<string, THREE.Color> = new Map()

  constructor() {
    this.group = new THREE.Group()
    this.generateNetwork()
  }

  private generateNetwork() {
    const nodeCount = 10 + Math.floor(Math.random() * 3)
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.random() * Math.PI * 2
      const theta = Math.random() * Math.PI * 0.45
      const radius = 4 + Math.random() * 6
      const x = radius * Math.sin(theta) * Math.cos(phi)
      const y = radius * Math.cos(theta) * 0.6
      const z = radius * Math.sin(theta) * Math.sin(phi)
      this.nodes.push({
        id: i,
        position: new THREE.Vector3(x, y, z)
      })
    }

    const nodeGroups: number[][] = []
    const usedNodes = new Set<number>()
    for (let i = 0; i < nodeCount; i++) {
      if (usedNodes.has(i)) continue
      const group: number[] = [i]
      usedNodes.add(i)
      for (let j = i + 1; j < nodeCount; j++) {
        if (usedNodes.has(j)) continue
        const dist = this.nodes[i].position.distanceTo(this.nodes[j].position)
        if (dist < 8 && group.length < 4) {
          group.push(j)
          usedNodes.add(j)
        }
      }
      nodeGroups.push(group)
    }

    const pipeConnections: [number, number][] = []
    for (const group of nodeGroups) {
      for (let i = 0; i < group.length - 1; i++) {
        pipeConnections.push([group[i], group[i + 1]])
      }
      if (group.length >= 3 && Math.random() > 0.4) {
        pipeConnections.push([group[0], group[group.length - 1]])
      }
    }

    for (let i = 0; i < nodeGroups.length - 1; i++) {
      const g1 = nodeGroups[i]
      const g2 = nodeGroups[i + 1]
      const n1 = g1[Math.floor(Math.random() * g1.length)]
      const n2 = g2[Math.floor(Math.random() * g2.length)]
      pipeConnections.push([n1, n2])
    }

    const targetPipeCount = 17
    while (pipeConnections.length < targetPipeCount) {
      const n1 = Math.floor(Math.random() * nodeCount)
      let n2 = Math.floor(Math.random() * nodeCount)
      while (n2 === n1) n2 = Math.floor(Math.random() * nodeCount)
      const exists = pipeConnections.some(([a, b]) =>
        (a === n1 && b === n2) || (a === n2 && b === n1)
      )
      if (!exists) {
        const dist = this.nodes[n1].position.distanceTo(this.nodes[n2].position)
        if (dist < 14) {
          pipeConnections.push([n1, n2])
        }
      }
    }

    pipeConnections.forEach(([start, end], idx) => {
      const startPos = this.nodes[start].position
      const endPos = this.nodes[end].position
      const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5)
      const offsetDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.8 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize()
      const offsetAmount = 0.8 + Math.random() * 1.5
      const controlPoint = midPoint.add(offsetDir.multiplyScalar(offsetAmount))

      const curve = new THREE.CatmullRomCurve3([
        startPos.clone(),
        controlPoint.clone(),
        endPos.clone()
      ])

      const diameterOptions = [0.25, 0.32, 0.4, 0.5, 0.6]
      const diameter = diameterOptions[Math.floor(Math.random() * diameterOptions.length)]

      this.pipes.push({
        id: `PIPE-${String(idx + 1).padStart(3, '0')}`,
        startNode: start,
        endNode: end,
        curve,
        pressure: 15 + Math.random() * 75,
        flowRate: 0.8 + Math.random() * 4.2,
        temperature: 20 + Math.random() * 65,
        diameter,
        tubeSegments: Math.max(40, Math.floor(curve.getLength() * 8)),
        radialSegments: 16
      })
    })
  }

  public buildMeshes() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0])
    }
    this.pipeMeshes.clear()
    this.nodeMeshes.clear()
    this.originalColors.clear()

    this.pipes.forEach(pipe => {
      const geometry = new THREE.TubeGeometry(
        pipe.curve,
        pipe.tubeSegments,
        pipe.diameter,
        pipe.radialSegments,
        false
      )
      const color = new THREE.Color(pressureColorScale(pipe.pressure))
      this.originalColors.set(pipe.id, color.clone())

      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        specular: 0x333344,
        transparent: true,
        opacity: 0.95
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.pipeId = pipe.id
      mesh.userData.type = 'pipe'
      this.group.add(mesh)
      this.pipeMeshes.set(pipe.id, mesh)
    })

    this.nodes.forEach(node => {
      const geo = new THREE.SphereGeometry(0.45, 24, 24)
      const mat = new THREE.MeshPhongMaterial({
        color: 0x556677,
        shininess: 120,
        specular: 0xaabbcc
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(node.position)
      mesh.castShadow = true
      mesh.userData.nodeId = node.id
      mesh.userData.type = 'node'
      this.group.add(mesh)
      this.nodeMeshes.set(node.id, mesh)
    })
  }

  public updateColors() {
    this.pipes.forEach(pipe => {
      const mesh = this.pipeMeshes.get(pipe.id)
      if (mesh) {
        const targetColor = new THREE.Color(pressureColorScale(pipe.pressure))
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.color.lerp(targetColor, 0.08)
        this.originalColors.set(pipe.id, targetColor.clone())
      }
    })
  }

  public highlightPipe(pipeId: string) {
    const mesh = this.pipeMeshes.get(pipeId)
    if (!mesh) return
    this.highlightTargets.set(pipeId, { targetScale: 1.05, startTime: performance.now() })
    const mat = mesh.material as THREE.MeshPhongMaterial
    mat.emissive = new THREE.Color(0xffffff)
    mat.emissiveIntensity = 0.35
  }

  public updateHighlights(delta: number) {
    const now = performance.now()
    this.highlightTargets.forEach((data, pipeId) => {
      const mesh = this.pipeMeshes.get(pipeId)
      if (!mesh) {
        this.highlightTargets.delete(pipeId)
        return
      }
      const elapsed = (now - data.startTime) / 1000
      if (elapsed > 1.5) {
        mesh.scale.set(1, 1, 1)
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.emissive = new THREE.Color(0x000000)
        mat.emissiveIntensity = 0
        this.highlightTargets.delete(pipeId)
      } else {
        const t = elapsed / 1.5
        const ease = 1 - Math.pow(1 - t, 3)
        const scale = 1 + 0.05 * (1 - ease)
        mesh.scale.set(scale, scale, scale)
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.emissiveIntensity = 0.35 * (1 - ease)
      }
    })
  }

  public simulateDataUpdate(delta: number) {
    this.pipes.forEach(pipe => {
      const pressureNoise = (Math.random() - 0.5) * 3 * delta
      pipe.pressure = Math.max(5, Math.min(98, pipe.pressure + pressureNoise))
      if (pipe.id === 'PIPE-005' || pipe.id === 'PIPE-012') {
        pipe.pressure = Math.min(98, pipe.pressure + Math.random() * 0.3)
      }
      const flowNoise = (Math.random() - 0.5) * 0.5 * delta
      pipe.flowRate = Math.max(0.3, Math.min(6, pipe.flowRate + flowNoise))
      const tempNoise = (Math.random() - 0.5) * 1.5 * delta
      pipe.temperature = Math.max(15, Math.min(95, pipe.temperature + tempNoise))
    })
  }

  public applyLOD(camera: THREE.Camera) {
    this.pipes.forEach(pipe => {
      const mesh = this.pipeMeshes.get(pipe.id)
      if (!mesh) return
      const center = pipe.curve.getPoint(0.5)
      const dist = camera.position.distanceTo(center)
      if (dist > 20) {
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.opacity = 0.7
      } else {
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.opacity = 0.95
      }
    })
  }

  public getSummaryStats() {
    const highPressureCount = this.pipes.filter(p => p.pressure > 80).length
    const avgFlow = this.pipes.reduce((sum, p) => sum + p.flowRate, 0) / this.pipes.length
    const maxTemp = this.pipes.reduce((max, p) => Math.max(max, p.temperature), 0)
    return {
      total: this.pipes.length,
      highPressure: highPressureCount,
      averageFlow: avgFlow,
      maxTemperature: maxTemp
    }
  }

  public getPipeById(id: string): PipeData | undefined {
    return this.pipes.find(p => p.id === id)
  }
}
