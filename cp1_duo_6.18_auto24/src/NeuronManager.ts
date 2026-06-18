import * as THREE from 'three'

export interface NeuronNode {
  id: number
  position: THREE.Vector3
  color: string
  type: 'presynaptic' | 'postsynaptic'
  isHighlighted: boolean
  flashTime: number
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
  private synapseCount: number = 30
  private readonly distance: number = 6
  private readonly nodeRadius: number = 0.4

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
        color: '#4da6ff',
        type: 'presynaptic',
        isHighlighted: false,
        flashTime: 0,
      })

      this.postsynapticNodes.push({
        id: i + count,
        position: new THREE.Vector3(this.distance / 2, yOffset, zOffset),
        color: '#66bb6a',
        type: 'postsynaptic',
        isHighlighted: false,
        flashTime: 0,
      })
    }
  }

  private generateConnections(): void {
    this.connections = []
    const count = this.synapseCount

    for (let i = 0; i < count; i++) {
      this.connections.push({
        id: `conn-${i}`,
        presynapticId: i,
        postsynapticId: i + count,
        isHighlighted: false,
      })
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

  public getNodeById(id: number): NeuronNode | undefined {
    if (id < this.synapseCount) {
      return this.presynapticNodes[id]
    }
    return this.postsynapticNodes[id - this.synapseCount]
  }

  public getNodeRadius(): number {
    return this.nodeRadius
  }

  public highlightNode(nodeId: number, highlighted: boolean): void {
    const node = this.getNodeById(nodeId)
    if (node) {
      node.isHighlighted = highlighted
    }

    this.connections.forEach((conn) => {
      if (conn.presynapticId === nodeId || conn.postsynapticId === nodeId) {
        conn.isHighlighted = highlighted
      }
    })
  }

  public triggerFlash(postsynapticId: number): void {
    const node = this.getNodeById(postsynapticId)
    if (node && node.type === 'postsynaptic') {
      node.flashTime = Date.now()
    }
  }

  public isFlashing(nodeId: number, delayMs: number): boolean {
    const node = this.getNodeById(nodeId)
    if (!node) return false
    return Date.now() - node.flashTime < delayMs
  }
}
