import * as THREE from 'three'

export interface NeuronNode {
  id: number
  position: THREE.Vector3
  color: string
  type: 'presynaptic' | 'postsynaptic'
  isHighlighted: boolean
  flashTime: number
  pulseTime: number
  pulseType: 'emit' | 'receive' | null
}

export interface Connection {
  id: string
  presynapticId: number
  postsynapticId: number
  isHighlighted: boolean
}

export class NeuronManager {
  private presynapticNodes: NeuronNode[] = []
  private postsynapticNodes: NeuronNode[] = []
  private connections: Connection[] = []
  private nodeToConnectionsMap: Map<number, string[]> = new Map()
  private synapseCount: number = 30
  private readonly distance: number = 6
  private readonly nodeRadius: number = 0.4
  private readonly presynapticColor: string = '#4da6ff'
  private readonly postsynapticColor: string = '#66bb6a'

  constructor(count: number = 30) {
    this.synapseCount = count
    this.generateNodes()
    this.generateConnections()
  }

  private generateNodes(): void {
    this.presynapticNodes = []
    this.postsynapticNodes = []

    const count = this.synapseCount
    const spread = Math.max(2, count * 0.3)

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      const yOffset = (t - 0.5) * spread * 2
      const zOffset = (Math.random() - 0.5) * spread * 0.8

      this.presynapticNodes.push({
        id: i,
        position: new THREE.Vector3(-this.distance / 2, yOffset, zOffset),
        color: this.presynapticColor,
        type: 'presynaptic',
        isHighlighted: false,
        flashTime: 0,
        pulseTime: 0,
        pulseType: null,
      })

      this.postsynapticNodes.push({
        id: i + count,
        position: new THREE.Vector3(this.distance / 2, yOffset, zOffset),
        color: this.postsynapticColor,
        type: 'postsynaptic',
        isHighlighted: false,
        flashTime: 0,
        pulseTime: 0,
        pulseType: null,
      })
    }
  }

  private generateConnections(): void {
    const startTime = performance.now()
    this.connections = []
    this.nodeToConnectionsMap.clear()
    const count = this.synapseCount

    for (let i = 0; i < count; i++) {
      const connId = `conn-${i}`
      const preId = i
      const postId = i + count

      this.connections.push({
        id: connId,
        presynapticId: preId,
        postsynapticId: postId,
        isHighlighted: false,
      })

      if (!this.nodeToConnectionsMap.has(preId)) {
        this.nodeToConnectionsMap.set(preId, [])
      }
      this.nodeToConnectionsMap.get(preId)!.push(connId)

      if (!this.nodeToConnectionsMap.has(postId)) {
        this.nodeToConnectionsMap.set(postId, [])
      }
      this.nodeToConnectionsMap.get(postId)!.push(connId)
    }

    const elapsed = performance.now() - startTime
    if (elapsed > 20) {
      console.warn(`Connection generation took ${elapsed.toFixed(2)}ms, exceeds 20ms limit`)
    }
  }

  public randomizePositions(): void {
    const count = this.synapseCount
    const spread = Math.max(2, count * 0.3)

    for (let i = 0; i < count; i++) {
      const yPre = (Math.random() - 0.5) * spread * 2
      const zPre = (Math.random() - 0.5) * spread * 1.5
      this.presynapticNodes[i].position.set(-this.distance / 2, yPre, zPre)

      const yPost = (Math.random() - 0.5) * spread * 2
      const zPost = (Math.random() - 0.5) * spread * 1.5
      this.postsynapticNodes[i].position.set(this.distance / 2, yPost, zPost)
    }
  }

  public resetPositions(): void {
    this.generateNodes()
    this.generateConnections()
  }

  public setSynapseCount(count: number): void {
    this.synapseCount = count
    this.generateNodes()
    this.generateConnections()
  }

  public getSynapseCount(): number {
    return this.synapseCount
  }

  public getPresynapticNodes(): NeuronNode[] {
    return this.presynapticNodes
  }

  public getPostsynapticNodes(): NeuronNode[] {
    return this.postsynapticNodes
  }

  public getAllNodes(): NeuronNode[] {
    return [...this.presynapticNodes, ...this.postsynapticNodes]
  }

  public getConnections(): Connection[] {
    return this.connections
  }

  public getConnectionById(id: string): Connection | undefined {
    return this.connections.find((c) => c.id === id)
  }

  public getNodeById(id: number): NeuronNode | undefined {
    if (id < this.synapseCount) {
      return this.presynapticNodes[id]
    }
    return this.postsynapticNodes[id - this.synapseCount]
  }

  public getConnectionsForNode(nodeId: number): Connection[] {
    const connIds = this.nodeToConnectionsMap.get(nodeId) || []
    return connIds
      .map((id) => this.getConnectionById(id))
      .filter((c): c is Connection => c !== undefined)
  }

  public getNodeRadius(): number {
    return this.nodeRadius
  }

  public highlightNode(nodeId: number, highlighted: boolean): void {
    const node = this.getNodeById(nodeId)
    if (node) {
      node.isHighlighted = highlighted
    }

    const conns = this.getConnectionsForNode(nodeId)
    conns.forEach((conn) => {
      conn.isHighlighted = highlighted
    })
  }

  public clearAllHighlights(): void {
    this.getAllNodes().forEach((n) => (n.isHighlighted = false))
    this.connections.forEach((c) => (c.isHighlighted = false))
  }

  public triggerFlash(postsynapticId: number): void {
    const node = this.getNodeById(postsynapticId)
    if (node && node.type === 'postsynaptic') {
      node.flashTime = Date.now()
      node.pulseTime = Date.now()
      node.pulseType = 'receive'
    }
  }

  public triggerEmitPulse(presynapticId: number): void {
    const node = this.getNodeById(presynapticId)
    if (node && node.type === 'presynaptic') {
      node.pulseTime = Date.now()
      node.pulseType = 'emit'
    }
  }

  public getPulseIntensity(nodeId: number, pulseDurationMs: number = 200): number {
    const node = this.getNodeById(nodeId)
    if (!node || !node.pulseTime || !node.pulseType) return 0

    const elapsed = Date.now() - node.pulseTime
    if (elapsed >= pulseDurationMs) return 0

    const t = 1 - elapsed / pulseDurationMs
    return t * t
  }

  public getPulseColor(nodeId: number): string | null {
    const node = this.getNodeById(nodeId)
    if (!node || !node.pulseType) return null

    if (node.pulseType === 'emit') {
      return '#80c8ff'
    } else {
      return '#a5d6a7'
    }
  }

  public isFlashing(nodeId: number, delayMs: number): boolean {
    const node = this.getNodeById(nodeId)
    if (!node) return false
    return Date.now() - node.flashTime < delayMs
  }

  public getFlashingNodes(delayMs: number): Set<number> {
    const flashing = new Set<number>()
    this.postsynapticNodes.forEach((node) => {
      if (this.isFlashing(node.id, delayMs)) {
        flashing.add(node.id)
      }
    })
    return flashing
  }
}
