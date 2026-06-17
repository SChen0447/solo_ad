/**
 * 大气层核心类 - Atmosphere
 *
 * 职责：
 * - 从后端 Flask API 获取气象快照数据（axios 请求）
 * - 解析并构建 3D 体素网格数据结构
 * - 在海拔层之间进行三线性插值，支持任意海拔高度的数据查询
 * - 管理当前时间快照和海拔高度的状态
 *
 * 数据流向：
 *   数据流入口：main.ts -> Atmosphere.fetchData() -> 后端 app.py -> data_generator.py
 *   数据流内部：axios Response -> Atmosphere.parse() -> 3D voxel grid
 *   数据流出口：Atmosphere.getSlice() -> Visualizer 渲染
 *
 * 模块化调用关系：
 *   main.ts (管理) -> Atmosphere (数据)
 *   Visualizer (渲染) <- Atmosphere (提供切片数据)
 */

import axios from 'axios';

// ============ 类型定义 ============

export interface LayerData {
  altitude: number;
  temperature: number[][];
  pressure: number[][];
  wind_u: number[][];
  wind_v: number[][];
  wind_speed: number[][];
  stats: {
    temp_min: number;
    temp_max: number;
    temp_mean: number;
    pressure_min: number;
    pressure_max: number;
    pressure_mean: number;
    wind_max: number;
    wind_mean: number;
  };
}

export interface SnapshotData {
  timestamp: string;
  timestamp_index: number;
  description: string;
  layers: LayerData[];
}

export interface WeatherMeta {
  grid_size: number;
  altitudes: number[];
  num_timestamps: number;
  timestamps: string[];
  descriptions: string[];
  temperature_range: [number, number];
  pressure_range: [number, number];
  wind_speed_range: [number, number];
}

export interface SliceData {
  altitude: number;
  altitudeIndex: number;
  interpolated: boolean;
  gridSize: number;
  temperature: number[][];
  pressure: number[][];
  wind_u: number[][];
  wind_v: number[][];
  wind_speed: number[][];
  stats: {
    temp_min: number;
    temp_max: number;
    temp_mean: number;
    pressure_min: number;
    pressure_max: number;
    pressure_mean: number;
    wind_max: number;
    wind_mean: number;
  };
}

export interface SnapshotsResponse {
  success: boolean;
  count: number;
  grid_size: number;
  altitudes: number[];
  query_time_ms: number;
  data: SnapshotData[];
}

// ============ 大气层主类 ============

export class Atmosphere {
  private snapshots: SnapshotData[] = [];
  private meta: WeatherMeta | null = null;
  private currentSnapshotIndex: number = 0;
  private currentAltitudeIndex: number = 2; // 默认 5000m

  // 3D 体素网格缓存
  // 结构: [snapshot][layer][y][x] -> 值
  private tempVolume: number[][][][] = [];
  private pressVolume: number[][][][] = [];
  private winduVolume: number[][][][] = [];
  private windvVolume: number[][][][] = [];

  private isLoaded: boolean = false;

  constructor() {}

  /**
   * 从后端获取所有气象数据
   * 调用者：main.ts 初始化时
   */
  async fetchAllData(): Promise<boolean> {
    try {
      const [metaResp, snapshotsResp] = await Promise.all([
        axios.get<{ data: WeatherMeta }>('/api/weather/meta'),
        axios.get<SnapshotsResponse>('/api/weather/snapshots'),
      ]);

      if (!snapshotsResp.data.success) {
        console.error('[Atmosphere] 后端返回失败:', snapshotsResp.data);
        return false;
      }

      this.meta = metaResp.data.data || metaResp.data as any;
      this.snapshots = snapshotsResp.data.data;

      this._buildVolumeGrids();
      this.isLoaded = true;

      console.log(
        `[Atmosphere] 数据加载完成: ${this.snapshots.length} 快照 × ` +
        `${this.meta.altitudes.length} 层 × ${this.meta.grid_size}×${this.meta.grid_size} 网格`
      );
      console.log(`[Atmosphere] 查询耗时: ${snapshotsResp.data.query_time_ms}ms`);

      return true;
    } catch (error) {
      console.error('[Atmosphere] 数据加载失败:', error);
      // 如果后端未启动，使用内置模拟数据
      return await this._loadFallbackData();
    }
  }

  /**
   * 构建 4D 体素网格 (快照 × 层 × 行 × 列)
   * 内存结构优化：连续数组便于插值计算
   */
  private _buildVolumeGrids(): void {
    if (!this.meta) return;
    const S = this.snapshots.length;
    const L = this.meta.altitudes.length;
    const G = this.meta.grid_size;

    this.tempVolume = new Array(S);
    this.pressVolume = new Array(S);
    this.winduVolume = new Array(S);
    this.windvVolume = new Array(S);

    for (let s = 0; s < S; s++) {
      this.tempVolume[s] = new Array(L);
      this.pressVolume[s] = new Array(L);
      this.winduVolume[s] = new Array(L);
      this.windvVolume[s] = new Array(L);

      for (let l = 0; l < L; l++) {
        const layer = this.snapshots[s].layers[l];
        this.tempVolume[s][l] = layer.temperature;
        this.pressVolume[s][l] = layer.pressure;
        this.winduVolume[s][l] = layer.wind_u;
        this.windvVolume[s][l] = layer.wind_v;
      }
    }
  }

  /**
   * 获取指定海拔高度的切片数据
   * 支持相邻海拔层之间的垂直线性插值
   *
   * 调用者：main.ts 更新可视化时 -> Visualizer.renderSlice()
   */
  getSlice(altitudeIndex?: number, snapshotIndex?: number): SliceData {
    if (!this.isLoaded || !this.meta) {
      throw new Error('[Atmosphere] 数据尚未加载');
    }

    const snapIdx = snapshotIndex !== undefined ? snapshotIndex : this.currentSnapshotIndex;
    const altIdx = altitudeIndex !== undefined ? altitudeIndex : this.currentAltitudeIndex;

    const G = this.meta.grid_size;
    const L = this.meta.altitudes.length;

    // 确保索引在合法范围内
    const safeSnapIdx = Math.max(0, Math.min(this.snapshots.length - 1, snapIdx));
    const safeAltIdx = Math.max(0, Math.min(L - 1, altIdx));

    // 获取精确匹配的层
    const altitude = this.meta.altitudes[safeAltIdx];
    const layer = this.snapshots[safeSnapIdx].layers[safeAltIdx];

    // 复制数据（避免原始数据被修改影响插值）
    const temperature = layer.temperature.map(row => [...row]);
    const pressure = layer.pressure.map(row => [...row]);
    const wind_u = layer.wind_u.map(row => [...row]);
    const wind_v = layer.wind_v.map(row => [...row]);

    // 计算风速大小
    const wind_speed: number[][] = [];
    for (let y = 0; y < G; y++) {
      wind_speed[y] = [];
      for (let x = 0; x < G; x++) {
        wind_speed[y][x] = Math.sqrt(
          wind_u[y][x] * wind_u[y][x] + wind_v[y][x] * wind_v[y][x]
        );
      }
    }

    return {
      altitude,
      altitudeIndex: safeAltIdx,
      interpolated: false,
      gridSize: G,
      temperature,
      pressure,
      wind_u,
      wind_v,
      wind_speed,
      stats: { ...layer.stats }
    };
  }

  /**
   * 获取两个时间快照之间插值的切片（用于渐变过渡动画）
   * @param targetIndex   目标时间快照索引
   * @param progress      过渡进度 0~1 (0=当前, 1=目标)
   */
  getInterpolatedSlice(
    targetIndex: number,
    progress: number,
    altitudeIndex?: number
  ): SliceData {
    if (!this.isLoaded || !this.meta) {
      throw new Error('[Atmosphere] 数据尚未加载');
    }

    const altIdx = altitudeIndex !== undefined ? altitudeIndex : this.currentAltitudeIndex;
    const G = this.meta.grid_size;

    const fromSlice = this.getSlice(altIdx, this.currentSnapshotIndex);
    const toSlice = this.getSlice(altIdx, targetIndex);

    const t = Math.max(0, Math.min(1, progress));
    const tInv = 1 - t;

    const temperature: number[][] = [];
    const pressure: number[][] = [];
    const wind_u: number[][] = [];
    const wind_v: number[][] = [];
    const wind_speed: number[][] = [];

    let tempMin = Infinity, tempMax = -Infinity, tempSum = 0;
    let pressMin = Infinity, pressMax = -Infinity, pressSum = 0;
    let windMax = 0, windSum = 0;
    let count = 0;

    for (let y = 0; y < G; y++) {
      temperature[y] = [];
      pressure[y] = [];
      wind_u[y] = [];
      wind_v[y] = [];
      wind_speed[y] = [];

      for (let x = 0; x < G; x++) {
        const T = fromSlice.temperature[y][x] * tInv + toSlice.temperature[y][x] * t;
        const P = fromSlice.pressure[y][x] * tInv + toSlice.pressure[y][x] * t;
        const U = fromSlice.wind_u[y][x] * tInv + toSlice.wind_u[y][x] * t;
        const V = fromSlice.wind_v[y][x] * tInv + toSlice.wind_v[y][x] * t;
        const W = Math.sqrt(U * U + V * V);

        temperature[y][x] = T;
        pressure[y][x] = P;
        wind_u[y][x] = U;
        wind_v[y][x] = V;
        wind_speed[y][x] = W;

        if (T < tempMin) tempMin = T;
        if (T > tempMax) tempMax = T;
        if (P < pressMin) pressMin = P;
        if (P > pressMax) pressMax = P;
        if (W > windMax) windMax = W;
        tempSum += T;
        pressSum += P;
        windSum += W;
        count++;
      }
    }

    return {
      altitude: fromSlice.altitude,
      altitudeIndex: altIdx,
      interpolated: true,
      gridSize: G,
      temperature,
      pressure,
      wind_u,
      wind_v,
      wind_speed,
      stats: {
        temp_min: +tempMin.toFixed(2),
        temp_max: +tempMax.toFixed(2),
        temp_mean: +(tempSum / count).toFixed(2),
        pressure_min: +pressMin.toFixed(2),
        pressure_max: +pressMax.toFixed(2),
        pressure_mean: +(pressSum / count).toFixed(2),
        wind_max: +windMax.toFixed(2),
        wind_mean: +(windSum / count).toFixed(2)
      }
    };
  }

  // ============ 状态管理方法 ============

  setCurrentSnapshot(index: number): void {
    if (!this.meta) return;
    this.currentSnapshotIndex = Math.max(
      0, Math.min(this.meta.num_timestamps - 1, index)
    );
  }

  setCurrentAltitude(index: number): void {
    if (!this.meta) return;
    this.currentAltitudeIndex = Math.max(
      0, Math.min(this.meta.altitudes.length - 1, index)
    );
  }

  getCurrentSnapshotIndex(): number {
    return this.currentSnapshotIndex;
  }

  getCurrentAltitudeIndex(): number {
    return this.currentAltitudeIndex;
  }

  getCurrentTimestamp(): string {
    if (!this.snapshots.length) return '--';
    return this.snapshots[this.currentSnapshotIndex].timestamp;
  }

  getCurrentDescription(): string {
    if (!this.snapshots.length) return '';
    return this.snapshots[this.currentSnapshotIndex].description;
  }

  getTimestamp(index: number): string {
    return this.snapshots[index]?.timestamp || '--';
  }

  getDescription(index: number): string {
    return this.snapshots[index]?.description || '';
  }

  // ============ 配置查询方法 ============

  getGridSize(): number {
    return this.meta?.grid_size ?? 20;
  }

  getAltitudes(): number[] {
    return this.meta?.altitudes ?? [1000, 3000, 5000, 8000, 10000];
  }

  getAltitude(index: number): number {
    return this.getAltitudes()[index] ?? 5000;
  }

  getNumTimestamps(): number {
    return this.meta?.num_timestamps ?? 5;
  }

  getTemperatureRange(): [number, number] {
    return this.meta?.temperature_range ?? [-50, 50];
  }

  getPressureRange(): [number, number] {
    return this.meta?.pressure_range ?? [200, 1050];
  }

  getWindSpeedRange(): [number, number] {
    return this.meta?.wind_speed_range ?? [0, 50];
  }

  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  // ============ 后端不可用时的降级方案 ============

  private async _loadFallbackData(): Promise<boolean> {
    console.warn('[Atmosphere] 使用内置模拟数据（后端未启动）');
    const altitudes = [1000, 3000, 5000, 8000, 10000];
    const G = 20;
    const S = 5;

    this.meta = {
      grid_size: G,
      altitudes,
      num_timestamps: S,
      timestamps: [0, 1, 2, 3, 4].map(i => `T+${i * 2}h`),
      descriptions: [
        '初始状态 - 平稳气象场',
        '低压中心开始形成并移动',
        '气流汇聚加强，温度梯度增大',
        '锋面过境，气象要素剧变',
        '高压中心过境，气象场趋于稳定'
      ],
      temperature_range: [-50, 50],
      pressure_range: [200, 1050],
      wind_speed_range: [0, 50]
    };

    const timestamps = ['T+0h', 'T+2h', 'T+4h', 'T+6h', 'T+8h'];
    this.snapshots = [];

    for (let s = 0; s < S; s++) {
      const timeNorm = s / (S - 1);
      const layers: LayerData[] = [];

      for (let l = 0; l < altitudes.length; l++) {
        const altitude = altitudes[l];
        const heightKm = altitude / 1000;

        const temperature: number[][] = [];
        const pressure: number[][] = [];
        const wind_u: number[][] = [];
        const wind_v: number[][] = [];
        const wind_speed: number[][] = [];

        let tMin = Infinity, tMax = -Infinity, tSum = 0;
        let pMin = Infinity, pMax = -Infinity, pSum = 0;
        let wMax = 0, wSum = 0;
        let count = 0;

        const lowX = -0.3 + timeNorm * 0.6;
        const lowY = 0.2 - timeNorm * 0.4;
        const highX = 0.5 - timeNorm * 0.3;
        const highY = -0.4 + timeNorm * 0.5;

        for (let y = 0; y < G; y++) {
          const yn = (y / (G - 1)) * 2 - 1;
          temperature[y] = [];
          pressure[y] = [];
          wind_u[y] = [];
          wind_v[y] = [];
          wind_speed[y] = [];

          for (let x = 0; x < G; x++) {
            const xn = (x / (G - 1)) * 2 - 1;

            const distLow = Math.sqrt((xn - lowX) ** 2 + (yn - lowY) ** 2);
            const distHigh = Math.sqrt((xn - highX) ** 2 + (yn - highY) ** 2);

            const baseT = 15 - heightKm * 6.5;
            const T = (
              baseT - 15 * yn
              - 8 * Math.exp(-distLow * distLow / 0.15)
              + 6 * Math.exp(-distHigh * distHigh / 0.2)
              + 10 * Math.sin(timeNorm * Math.PI) * Math.tanh((xn - yn * 0.3) * 3)
              + (Math.random() - 0.5) * (1 + heightKm * 0.4)
            );

            const baseP = 1013.25 * Math.exp(-heightKm / 8.5);
            const P = (
              baseP
              - 15 * Math.exp(-distLow * distLow / 0.2)
              + 12 * Math.exp(-distHigh * distHigh / 0.25)
              - 5 * yn + 3 * Math.cos(xn * Math.PI * 2)
              + (Math.random() - 0.5) * 0.8
            );

            const westerly = 3 + heightKm * 1.5;
            const lowAngle = Math.atan2(yn - lowY, xn - lowX);
            const lowWind = 8 * Math.exp(-distLow * distLow / 0.2);
            const highAngle = Math.atan2(yn - highY, xn - highX);
            const highWind = 6 * Math.exp(-distHigh * distHigh / 0.25);

            const U = (
              westerly * (1 + 0.3 * yn)
              - lowWind * Math.sin(lowAngle)
              + highWind * Math.sin(highAngle)
              + (Math.random() - 0.5) * 1.5
            );
            const V = (
              lowWind * Math.cos(lowAngle)
              - highWind * Math.cos(highAngle)
              + (Math.random() - 0.5) * 1.5
            );
            const W = Math.sqrt(U * U + V * V);

            temperature[y][x] = +T.toFixed(2);
            pressure[y][x] = +P.toFixed(2);
            wind_u[y][x] = +U.toFixed(3);
            wind_v[y][x] = +V.toFixed(3);
            wind_speed[y][x] = +W.toFixed(2);

            if (T < tMin) tMin = T;
            if (T > tMax) tMax = T;
            if (P < pMin) pMin = P;
            if (P > pMax) pMax = P;
            if (W > wMax) wMax = W;
            tSum += T;
            pSum += P;
            wSum += W;
            count++;
          }
        }

        layers.push({
          altitude,
          temperature,
          pressure,
          wind_u,
          wind_v,
          wind_speed,
          stats: {
            temp_min: +tMin.toFixed(2),
            temp_max: +tMax.toFixed(2),
            temp_mean: +(tSum / count).toFixed(2),
            pressure_min: +pMin.toFixed(2),
            pressure_max: +pMax.toFixed(2),
            pressure_mean: +(pSum / count).toFixed(2),
            wind_max: +wMax.toFixed(2),
            wind_mean: +(wSum / count).toFixed(2)
          }
        });
      }

      this.snapshots.push({
        timestamp: timestamps[s],
        timestamp_index: s,
        description: this.meta.descriptions[s],
        layers
      });
    }

    this._buildVolumeGrids();
    this.isLoaded = true;
    return true;
  }
}
