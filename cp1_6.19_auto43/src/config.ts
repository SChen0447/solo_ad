export const GRID_SIZE = 20;

export const CELL_SIZE = 2;

export const HALF_GRID = GRID_SIZE / 2;

export const SOURCE_POS_DEFAULT = { x: 0, y: 0, z: 0 };

export const SOURCE_RANGE = { min: -20, max: 20, step: 1 };

export const MAGNITUDE_RANGE = { min: 1, max: 10, step: 0.5 };

export const MAGNITUDE_DEFAULT = 5;

export const WAVE_SPEED = 3.0;

export const WAVE_DAMPING = 0.985;

export const DT = 0.016;

export const SIM_DURATION = 60;

export const OBSERVATION_POINTS = [
  { id: 'A', x: 5, y: 3, z: 0, label: '观测点 A' },
  { id: 'B', x: -8, y: 5, z: 3, label: '观测点 B' },
  { id: 'C', x: 2, y: -6, z: 8, label: '观测点 C' },
];

export const FAULT_PLANE_SIZE = 20;

export const FAULT_TILT_ANGLE = 45;

export const FAULT_CENTER = { x: 3, y: 0, z: 0 };

export const WAVEFRONT_COLOR_CENTER = '#ff3333';

export const WAVEFRONT_COLOR_EDGE = '#3366ff';

export const WAVEFRONT_OPACITY_CENTER = 0.8;

export const WAVEFRONT_OPACITY_EDGE = 0.1;

export const FAULT_COLOR_NORMAL_START = '#444466';

export const FAULT_COLOR_NORMAL_END = '#6666aa';

export const FAULT_COLOR_ACTIVATED = '#ffff00';

export const FAULT_ACTIVATION_DELAY = 500;

export const CHART_WAVEFORM_COLOR = '#00ff88';

export const CHART_GRID_COLOR = '#333333';

export const CHART_TIME_RANGE = 60;

export const CHART_DISPLACEMENT_RANGE = 5;

export const CHART_BAR_WIDTH = 4;

export const STRESS_COLOR_LOW = '#00ff00';

export const STRESS_COLOR_HIGH = '#ff0000';

export const CAMERA_INITIAL_POSITION = { x: 30, y: 25, z: 40 };

export const CAMERA_LOOK_AT = { x: 0, y: 0, z: 0 };

export const ROTATION_SPEED = 0.2;

export const DAMPING_FACTOR = 0.95;

export const ZOOM_MIN = 10;

export const ZOOM_MAX = 80;

export const PLAYBACK_SPEEDS = [0.1, 0.5, 1, 2, 5];

export const DATA_PANEL_UPDATE_INTERVAL = 100;

export const TARGET_FPS = 60;

export const MIN_FPS = 45;

export const MAX_VOXEL_UPDATE_MS = 8;

export const ISOVALUE_THRESHOLD = 0.1;

export const COLOR_MAP_STEPS = 64;
