## 1. 架构设计

```mermaid
architecture-beta
    group app(application)[浏览器应用]
    group ui(frontend)[UI层]
    group scene(rendering)[3D渲染层]
    group detection(gesture)[手势识别层]
    group audio(audio)[音频引擎层]
    
    service app_tsx[App.tsx] in ui
    service instrument_scene[InstrumentScene.tsx] in scene
    service hand_detection[HandDetection.ts] in detection
    service audio_engine[AudioEngine.ts] in audio
    
    service mediapipe[@mediapipe/hands] in detection
    service three[Three.js] in scene
    service web_audio[Web Audio API] in audio
    
    app_tsx:R --> L:instrument_scene
    app_tsx:R --> L:hand_detection
    app_tsx:R --> L:audio_engine
    
    instrument_scene:R --> L:three
    hand_detection:R --> L:mediapipe
    audio_engine:R --> L:web_audio
    
    hand_detection:D --> U:instrument_scene
    hand_detection:D --> U:audio_engine
```

## 2. 技术描述

- **前端框架**：React 18 + TypeScript 5
- **构建工具**：Vite 5
- **3D渲染**：Three.js 0.160
- **手势识别**：MediaPipe Hands 0.4 + TensorFlow.js 4.14 + handpose 0.1
- **音频合成**：Web Audio API（原生）
- **状态管理**：React Hooks（useState, useEffect, useRef）
- **样式方案**：原生CSS + CSS变量

## 3. 模块划分与文件结构

```
src/
├── InstrumentScene.tsx    # Three.js 3D钢琴场景组件
│   ├── 琴键模型创建与管理
│   ├── 手势坐标到3D空间的映射
│   ├── 琴键按下/释放动画
│   └── 手部关键点可视化
├── HandDetection.ts       # MediaPipe手势识别封装
│   ├── 摄像头视频流初始化
│   ├── 21个关键点检测
│   ├── 指尖坐标标准化输出
│   └── 按压阈值与停留检测
├── AudioEngine.ts         # Web Audio API钢琴合成器
│   ├── 音符基频+3层泛音合成
│   ├── ADSR包络控制
│   ├── 音量映射（压力→0~1）
│   └── MIDI音高映射表
├── App.tsx                # 根组件
│   ├── 摄像头权限请求
│   ├── 模块组合与状态协调
│   └── 应用生命周期管理
└── main.tsx               # 应用入口
```

## 4. 核心数据结构

### 4.1 手部关键点数据
```typescript
interface HandLandmark {
  x: number;      // 0~1 标准化坐标
  y: number;      // 0~1 标准化坐标
  z: number;      // 相对深度
}

interface HandData {
  landmarks: HandLandmark[];      // 21个关键点
  handedness: 'Left' | 'Right';   // 左右手
  timestamp: number;              // 检测时间戳
}
```

### 4.2 琴键数据
```typescript
interface PianoKey {
  note: string;           // 音名 C2, C#2, ..., B3
  midi: number;           // MIDI音高 48~71
  type: 'white' | 'black';
  x: number;              // 3D空间X坐标
  width: number;          // 白键60px, 黑键36px
  height: number;         // 白键200px, 黑键120px
  isPressed: boolean;     // 按下状态
  pressStartTime: number; // 按下开始时间
}
```

### 4.3 音符数据
```typescript
interface Note {
  midi: number;           // MIDI音高
  frequency: number;      // 实际频率
  velocity: number;       // 音量 0~1
  startTime: number;
  oscillators: OscillatorNode[];
  gainNode: GainNode;
}
```

## 5. 关键技术实现

### 5.1 坐标映射算法
```
视频流坐标(640x480) → 标准化坐标(0~1) → 3D场景坐标
  x: videoX / 640 → (x - 0.5) * sceneWidth
  y: videoY / 480 → (0.5 - y) * sceneHeight
```

### 5.2 按下检测逻辑
```
触发条件:
  1. 指尖(x,y)在琴键矩形边界内
  2. 停留时间 > 150ms
  3. 指尖y坐标 < 按下阈值
释放条件:
  1. 指尖离开琴键边界
  2. 指尖y坐标 > 释放阈值
```

### 5.3 钢琴音色合成
```
基频 + 3层泛音:
  1倍频: 振幅 0.6  (正弦波)
  2倍频: 振幅 0.3  (三角波)
  3倍频: 振幅 0.15 (正弦波)
  4倍频: 振幅 0.08 (正弦波)

ADSR包络:
  Attack:  0.01s
  Decay:   0.3s
  Sustain: 0.4
  Release: 0.8s
```

### 5.4 性能优化策略
1. **手势识别**：限制检测帧率30FPS，使用WebAssembly加速
2. **3D渲染**：合并琴键几何体，使用实例化渲染，关闭不必要的阴影
3. **音频引擎**：复用Oscillator节点池，限制同时发声数量为8个
4. **动画**：使用requestAnimationFrame统一驱动，琴键动画在16ms内响应

## 6. 性能指标要求

| 指标 | 要求 |
|------|------|
| 手势检测→音符发声延迟 | < 80ms |
| 帧率（中等配置笔记本） | ≥ 30FPS |
| 琴键动画响应延迟 | < 16ms |
| 内存占用 | < 200MB |
| CPU占用（i5集成显卡） | < 60% |

## 7. MIDI音高映射表

| 音名 | MIDI | 频率(Hz) | 类型 |
|------|------|----------|------|
| C2 | 48 | 65.41 | 白键 |
| C#2 | 49 | 69.30 | 黑键 |
| D2 | 50 | 73.42 | 白键 |
| D#2 | 51 | 77.78 | 黑键 |
| E2 | 52 | 82.41 | 白键 |
| F2 | 53 | 87.31 | 白键 |
| F#2 | 54 | 92.50 | 黑键 |
| G2 | 55 | 98.00 | 白键 |
| G#2 | 56 | 103.83 | 黑键 |
| A2 | 57 | 110.00 | 白键 |
| A#2 | 58 | 116.54 | 黑键 |
| B2 | 59 | 123.47 | 白键 |
| C3 | 60 | 130.81 | 白键 |
| C#3 | 61 | 138.59 | 黑键 |
| D3 | 62 | 146.83 | 白键 |
| D#3 | 63 | 155.56 | 黑键 |
| E3 | 64 | 164.81 | 白键 |
| F3 | 65 | 174.61 | 白键 |
| F#3 | 66 | 185.00 | 黑键 |
| G3 | 67 | 196.00 | 白键 |
| G#3 | 68 | 207.65 | 黑键 |
| A3 | 69 | 220.00 | 白键 |
| A#3 | 70 | 233.08 | 黑键 |
| B3 | 71 | 246.94 | 白键 |
