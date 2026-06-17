import numpy as np
import math
from typing import List, Dict, Any, Tuple


class DataGenerator:
    """
    气象数据生成模块
    
    职责：
    - 模拟生成符合物理规律的大气层气象数据
    - 为每个时间快照生成5层海拔高度上的温度、气压、风速网格
    - 数据流向：被 app.py 调用生成数据，然后通过 API 返回给前端
    
    物理规律：
    - 温度随高度增加而递减（对流层约 6.5°C/km）
    - 气压随高度增加呈指数下降
    - 风速随高度增加而增大
    - 加入天气系统（低压/高压中心）的动态演变
    """

    GRID_SIZE = 20
    ALTITUDES = [1000, 3000, 5000, 8000, 10000]
    NUM_TIMESTAMPS = 5

    def __init__(self, seed: int = 42):
        self.seed = seed
        np.random.seed(seed)

    def generate_all_snapshots(self) -> List[Dict[str, Any]]:
        """
        生成所有时间快照数据
        
        数据流向：被 app.py 的 /api/weather/snapshots 接口调用
        返回：5个时间快照的完整气象数据列表
        """
        snapshots = []
        for t in range(self.NUM_TIMESTAMPS):
            snapshot = self._generate_single_snapshot(t)
            snapshots.append(snapshot)
        return snapshots

    def _generate_single_snapshot(self, timestamp_index: int) -> Dict[str, Any]:
        """
        生成单个时间快照数据
        
        参数：
            timestamp_index: 时间索引 (0-4)
        
        返回：
            {
                "timestamp": "T+2h",
                "description": "...",
                "layers": [
                    {
                        "altitude": 5000,
                        "temperature": [[...]],   # 20x20 温度网格 °C
                        "pressure": [[...]],      # 20x20 气压网格 hPa
                        "wind_u": [[...]],        # 20x20 纬向风速 m/s
                        "wind_v": [[...]],        # 20x20 经向风速 m/s
                        "wind_speed": [[...]]     # 20x20 风速大小 m/s
                    },
                    ...
                ]
            }
        """
        time_hours = timestamp_index * 2
        descriptions = [
            "初始状态 - 平稳气象场",
            "低压中心开始形成并移动",
            "气流汇聚加强，温度梯度增大",
            "锋面过境，气象要素剧变",
            "高压中心过境，气象场趋于稳定"
        ]

        layers = []
        for layer_idx, altitude in enumerate(self.ALTITUDES):
            layer_data = self._generate_layer(
                altitude, timestamp_index, layer_idx
            )
            layers.append(layer_data)

        return {
            "timestamp": f"T+{time_hours}h",
            "timestamp_index": timestamp_index,
            "description": descriptions[timestamp_index],
            "layers": layers
        }

    def _generate_layer(
        self,
        altitude: int,
        timestamp_index: int,
        layer_idx: int
    ) -> Dict[str, Any]:
        """
        生成单个海拔层的气象网格数据
        
        物理模型：
        1. 温度基础场：随高度递减 + 纬度温度梯度 + 天气系统扰动
        2. 气压基础场：标准大气指数递减 + 高低压系统扰动
        3. 风场：地转风（气压梯度力+科里奥利力）+ 系统环流
        """
        size = self.GRID_SIZE
        time = timestamp_index / (self.NUM_TIMESTAMPS - 1)

        # 生成坐标网格 (归一化到 -1 ~ 1)
        x = np.linspace(-1, 1, size)
        y = np.linspace(-1, 1, size)
        X, Y = np.meshgrid(x, y)

        # === 1. 温度场 ===
        # 标准大气温度递减率约 6.5°C/km，地面参考 15°C
        base_temp = 15.0 - (altitude / 1000) * 6.5

        # 纬度温度梯度（假设Y轴向北，温度向北递减）
        lat_gradient = -15.0 * Y

        # 天气系统温度扰动 - 随时间演变
        # 低压中心位置随时间移动
        low_center_x = -0.3 + time * 0.6
        low_center_y = 0.2 - time * 0.4
        dist_to_low = np.sqrt((X - low_center_x) ** 2 + (Y - low_center_y) ** 2)

        # 高压中心
        high_center_x = 0.5 - time * 0.3
        high_center_y = -0.4 + time * 0.5
        dist_to_high = np.sqrt((X - high_center_x) ** 2 + (Y - high_center_y) ** 2)

        # 温度扰动：低压中心附近上升气流降温，高压附近下沉气流升温
        temp_perturbation = (
            -8.0 * np.exp(-dist_to_low ** 2 / 0.15)  # 低压中心冷
            + 6.0 * np.exp(-dist_to_high ** 2 / 0.2)  # 高压中心暖
        )

        # 锋面温度梯度（随时间增强后减弱）
        front_strength = 10.0 * np.sin(time * np.pi)
        front_gradient = front_strength * np.tanh((X - Y * 0.3) * 3)

        # 小尺度随机扰动（随高度增大）
        noise_scale = 1.0 + (altitude / 5000) * 2.0
        random_noise = (np.random.rand(size, size) - 0.5) * noise_scale

        temperature = base_temp + lat_gradient + temp_perturbation + front_gradient + random_noise

        # === 2. 气压场 ===
        # 标准大气压：1013.25 hPa 地面，指数递减
        height_km = altitude / 1000
        base_pressure = 1013.25 * np.exp(-height_km / 8.5)

        # 气压系统扰动
        pressure_perturbation = (
            -15.0 * np.exp(-dist_to_low ** 2 / 0.2)   # 低压
            + 12.0 * np.exp(-dist_to_high ** 2 / 0.25)  # 高压
        )

        # 气压的纬向变化（模拟副热带高压等）
        zonal_variation = -5.0 * Y + 3.0 * np.cos(X * np.pi * 2)

        # 小尺度噪声
        pressure_noise = (np.random.rand(size, size) - 0.5) * 0.8

        pressure = base_pressure + pressure_perturbation + zonal_variation + pressure_noise

        # === 3. 风场 ===
        # 计算气压梯度（有限差分）
        dp_dx = np.zeros_like(pressure)
        dp_dy = np.zeros_like(pressure)
        dp_dx[:, 1:-1] = (pressure[:, 2:] - pressure[:, :-2]) / 2
        dp_dy[1:-1, :] = (pressure[2:, :] - pressure[:-2, :]) / 2
        dp_dx[:, 0] = dp_dx[:, 1]
        dp_dx[:, -1] = dp_dx[:, -2]
        dp_dy[0, :] = dp_dy[1, :]
        dp_dy[-1, :] = dp_dy[-2, :]

        # 地转风近似：与等压线平行，北半球背风而立高压在右
        # 即 V_g = (1/(fρ)) * (-dp/dy, dp/dx) 的旋转
        f_coriolis = 1e-4  # 科里奥利参数近似值
        rho = 1.225 * np.exp(-height_km / 8.5)  # 空气密度

        # 地转风缩放系数（用于可视化，非严格物理量纲）
        geo_scale = 0.5 / (f_coriolis * rho)

        wind_u_geo = -dp_dy * geo_scale
        wind_v_geo = dp_dx * geo_scale

        # 低压系统的旋转风场（气旋性环流，北半球逆时针）
        low_angle = np.arctan2(Y - low_center_y, X - low_center_x)
        low_radial_wind = 8.0 * np.exp(-dist_to_low ** 2 / 0.2)
        cyclone_u = -low_radial_wind * np.sin(low_angle)
        cyclone_v = low_radial_wind * np.cos(low_angle)

        # 高压系统的反气旋环流（顺时针）
        high_angle = np.arctan2(Y - high_center_y, X - high_center_x)
        high_radial_wind = 6.0 * np.exp(-dist_to_high ** 2 / 0.25)
        anticyclone_u = high_radial_wind * np.sin(high_angle)
        anticyclone_v = -high_radial_wind * np.cos(high_angle)

        # 基本西风气流（随高度增强）
        westerly_base = 3.0 + height_km * 1.5
        basic_wind_u = westerly_base * (1 + 0.3 * Y)
        basic_wind_v = np.zeros_like(X)

        # 叠加所有风场分量
        wind_u = wind_u_geo + cyclone_u + anticyclone_u + basic_wind_u
        wind_v = wind_v_geo + cyclone_v + anticyclone_v + basic_wind_v

        # 小尺度风扰动
        wind_u += (np.random.rand(size, size) - 0.5) * 1.5
        wind_v += (np.random.rand(size, size) - 0.5) * 1.5

        # 风速大小
        wind_speed = np.sqrt(wind_u ** 2 + wind_v ** 2)

        return {
            "altitude": altitude,
            "temperature": temperature.round(2).tolist(),
            "pressure": pressure.round(2).tolist(),
            "wind_u": wind_u.round(3).tolist(),
            "wind_v": wind_v.round(3).tolist(),
            "wind_speed": wind_speed.round(2).tolist(),
            "stats": {
                "temp_min": float(np.min(temperature).round(2)),
                "temp_max": float(np.max(temperature).round(2)),
                "temp_mean": float(np.mean(temperature).round(2)),
                "pressure_min": float(np.min(pressure).round(2)),
                "pressure_max": float(np.max(pressure).round(2)),
                "pressure_mean": float(np.mean(pressure).round(2)),
                "wind_max": float(np.max(wind_speed).round(2)),
                "wind_mean": float(np.mean(wind_speed).round(2))
            }
        }
