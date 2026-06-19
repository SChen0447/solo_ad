import * as THREE from 'three'

interface BuildingData {
  x: number
  z: number
  height: number
}

interface DrainData {
  x: number
  z: number
  drainRate: number
}

interface MonitoringPointData {
  x: number
  z: number
}

export class TerrainRenderer {
  public waterMeshes: THREE.Mesh[] = []
  public drainMeshes: THREE.Mesh[] = []
  public monitorMeshes: THREE.Mesh[] = []
  public onMonitorClick: ((index: number) => void) | null = null

  private scene: THREE.Scene
  private heightmap: Float32Array
  private buildings: BuildingData[]
  private drains: DrainData[]
  private monitoringPoints: MonitoringPointData[]
  private gridSize: number
  private cellSize: number

  private terrainMesh!: THREE.Mesh
  private buildingMeshes: THREE.Mesh[] = []
  private waterTime: number = 0
  private drainTime: number = 0
  private monitorTime: number = 0
  private initialWaterY: number = -10

  constructor(
    scene: THREE.Scene,
    heightmap: Float32Array,
    buildings: BuildingData[],
    drains: DrainData[],
    monitoringPoints: MonitoringPointData[],
    gridSize: number = 50,
    cellSize: number = 1
  ) {
    this.scene = scene
    this.heightmap = heightmap
    this.buildings = buildings
    this.drains = drains
    this.monitoringPoints = monitoringPoints
    this.gridSize = gridSize
    this.cellSize = cellSize

    this.createTerrain()
    this.createBuildings()
    this.createWater()
    this.createDrains()
    this.createMonitors()
  }

  private createTerrain(): void {
    const geometry = new THREE.PlaneGeometry(
      this.gridSize * this.cellSize,
      this.gridSize * this.cellSize,
      this.gridSize - 1,
      this.gridSize - 1
    )
    geometry.rotateX(-Math.PI / 2)

    const positions = geometry.attributes.position
    const colors = new Float32Array(positions.count * 3)
    const colorLow = new THREE.Color(0xc2a66a)
    const colorHigh = new THREE.Color(0x7cb342)

    let minHeight = Infinity
    let maxHeight = -Infinity
    for (let i = 0; i < this.heightmap.length; i++) {
      minHeight = Math.min(minHeight, this.heightmap[i])
      maxHeight = Math.max(maxHeight, this.heightmap[i])
    }

    for (let i = 0; i < positions.count; i++) {
      const x = Math.floor(i % this.gridSize)
      const z = Math.floor(i / this.gridSize)
      const height = this.heightmap[z * this.gridSize + x]
      positions.setY(i, height)

      const t = (height - minHeight) / (maxHeight - minHeight || 1)
      const color = colorLow.clone().lerp(colorHigh, t)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1
    })

    this.terrainMesh = new THREE.Mesh(geometry, material)
    this.terrainMesh.receiveShadow = true
    this.scene.add(this.terrainMesh)
  }

  private createBuildings(): void {
    const colorLow = new THREE.Color(0xcccccc)
    const colorHigh = new THREE.Color(0x666666)

    let minHeight = Infinity
    let maxHeight = -Infinity
    for (const building of this.buildings) {
      minHeight = Math.min(minHeight, building.height)
      maxHeight = Math.max(maxHeight, building.height)
    }

    for (const building of this.buildings) {
      const geometry = new THREE.BoxGeometry(
        this.cellSize * 0.8,
        building.height,
        this.cellSize * 0.8
      )

      const t = (building.height - minHeight) / (maxHeight - minHeight || 1)
      const color = colorLow.clone().lerp(colorHigh, t)
      const material = new THREE.MeshStandardMaterial({ color })

      const worldPos = this.getWorldPosition(building.x, building.z)
      const terrainHeight = this.heightmap[building.z * this.gridSize + building.x]

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(
        worldPos.x,
        terrainHeight + building.height / 2,
        worldPos.z
      )
      mesh.castShadow = true
      mesh.receiveShadow = true

      this.buildingMeshes.push(mesh)
      this.scene.add(mesh)
    }
  }

  private createWater(): void {
    for (let z = 0; z < this.gridSize; z++) {
      for (let x = 0; x < this.gridSize; x++) {
        const geometry = new THREE.PlaneGeometry(
          this.cellSize * 0.95,
          this.cellSize * 0.95,
          4,
          4
        )
        geometry.rotateX(-Math.PI / 2)

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(210 / 360, 0.8, 0.8),
          transparent: true,
          opacity: 0.7,
          roughness: 0.1,
          metalness: 0.3
        })

        const worldPos = this.getWorldPosition(x, z)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(worldPos.x, this.initialWaterY, worldPos.z)
        mesh.userData = { gridX: x, gridZ: z }

        this.waterMeshes.push(mesh)
        this.scene.add(mesh)
      }
    }
  }

  private createDrains(): void {
    for (let i = 0; i < this.drains.length; i++) {
      const drain = this.drains[i]
      const radius = 0.2 + drain.drainRate * 0.15
      const geometry = new THREE.TorusGeometry(radius, radius * 0.3, 8, 16)
      geometry.rotateX(-Math.PI / 2)

      const material = new THREE.MeshStandardMaterial({
        color: 0x555555,
        emissive: 0x000000,
        emissiveIntensity: 0
      })

      const worldPos = this.getWorldPosition(drain.x, drain.z)
      const terrainHeight = this.heightmap[drain.z * this.gridSize + drain.x]

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(worldPos.x, terrainHeight + 0.05, worldPos.z)
      mesh.userData = { index: i }

      this.drainMeshes.push(mesh)
      this.scene.add(mesh)
    }
  }

  private createMonitors(): void {
    for (let i = 0; i < this.monitoringPoints.length; i++) {
      const point = this.monitoringPoints[i]
      const geometry = new THREE.SphereGeometry(0.15, 16, 16)

      const material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.75,
        emissive: 0xff0000,
        emissiveIntensity: 0.3
      })

      const worldPos = this.getWorldPosition(point.x, point.z)
      const terrainHeight = this.heightmap[point.z * this.gridSize + point.x]

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(worldPos.x, terrainHeight + 0.3, worldPos.z)
      mesh.userData = { index: i, isMonitor: true }

      this.monitorMeshes.push(mesh)
      this.scene.add(mesh)
    }
  }

  public updateWaterLevels(waterLevel: Float32Array, deltaTime: number): void {
    this.waterTime += deltaTime

    for (let i = 0; i < this.waterMeshes.length; i++) {
      const mesh = this.waterMeshes[i]
      const gridX = mesh.userData.gridX
      const gridZ = mesh.userData.gridZ
      const level = waterLevel[gridZ * this.gridSize + gridX]
      const terrainHeight = this.heightmap[gridZ * this.gridSize + gridX]

      if (level > 0.01) {
        mesh.position.y = terrainHeight + level
        mesh.visible = true

        const positions = mesh.geometry.attributes.position
        for (let j = 0; j < positions.count; j++) {
          const vx = positions.getX(j)
          const vz = positions.getZ(j)
          const wave = Math.sin(this.waterTime * 3 + vx * 2 + vz * 2) * 0.02
          const originalY = (mesh.geometry as THREE.PlaneGeometry).parameters.heightSegments > 0 ? 0 : positions.getY(j)
          positions.setY(j, originalY + wave)
        }
        positions.needsUpdate = true
      } else {
        mesh.position.y = this.initialWaterY
        mesh.visible = false
      }
    }
  }

  public updateDrains(waterLevel: Float32Array, deltaTime: number): void {
    this.drainTime += deltaTime

    for (let i = 0; i < this.drainMeshes.length; i++) {
      const mesh = this.drainMeshes[i]
      const drain = this.drains[i]
      const material = mesh.material as THREE.MeshStandardMaterial

      mesh.rotation.y += deltaTime * Math.PI * 2

      let hasWater = false
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = drain.x + dx
          const gz = drain.z + dz
          if (gx >= 0 && gx < this.gridSize && gz >= 0 && gz < this.gridSize) {
            if (waterLevel[gz * this.gridSize + gx] > 0) {
              hasWater = true
              break
            }
          }
        }
        if (hasWater) break
      }

      if (hasWater) {
        const intensity = 0.5 + Math.sin(this.drainTime * 4) * 0.5
        material.color.setHex(0x00ff00)
        material.emissive.setHex(0x00ff00)
        material.emissiveIntensity = intensity
      } else {
        material.color.setHex(0x555555)
        material.emissive.setHex(0x000000)
        material.emissiveIntensity = 0
      }
    }
  }

  public updateMonitors(deltaTime: number): void {
    this.monitorTime += deltaTime

    for (const mesh of this.monitorMeshes) {
      const material = mesh.material as THREE.MeshStandardMaterial
      const t = (Math.sin(this.monitorTime * Math.PI * 2) + 1) / 2
      material.opacity = 0.5 + t * 0.5
    }
  }

  public updateWaterColor(averageLevel: number): void {
    const maxLevel = 2
    const t = Math.min(averageLevel / maxLevel, 1)

    const hue = THREE.MathUtils.lerp(210, 240, t) / 360
    const lightness = THREE.MathUtils.lerp(0.8, 0.4, t)

    const color = new THREE.Color().setHSL(hue, 0.8, lightness)

    for (const mesh of this.waterMeshes) {
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.copy(color)
    }
  }

  public getWorldPosition(gridX: number, gridZ: number): THREE.Vector3 {
    const offset = (this.gridSize - 1) * this.cellSize / 2
    return new THREE.Vector3(
      gridX * this.cellSize - offset,
      0,
      gridZ * this.cellSize - offset
    )
  }

  public reset(): void {
    for (const mesh of this.waterMeshes) {
      mesh.position.y = this.initialWaterY
      mesh.visible = false
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.setHSL(210 / 360, 0.8, 0.8)
    }

    for (const mesh of this.drainMeshes) {
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.setHex(0x555555)
      material.emissive.setHex(0x000000)
      material.emissiveIntensity = 0
      mesh.rotation.y = 0
    }

    this.waterTime = 0
    this.drainTime = 0
    this.monitorTime = 0
  }
}
