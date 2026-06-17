"""
Flask 后端服务 - 气象数据接口

职责：
- 启动 Flask Web 服务，监听 5000 端口
- 提供 RESTful API 接口供前端 axios 请求
- 调用 data_generator.py 生成气象数据

数据流向：
    data_generator.py -> app.py (生成数据) -> HTTP Response -> 前端 axios -> atmosphere.ts

启动方式：
    cd backend
    pip install flask flask-cors numpy
    python app.py
"""

import os
import sys
import json
import time

from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_generator import DataGenerator


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 全局数据生成器实例和缓存
_generator = DataGenerator(seed=42)
_cached_snapshots = None


def _get_or_generate_snapshots():
    """
    懒加载生成气象快照数据
    
    首次调用时生成所有数据并缓存，后续直接返回缓存
    性能优化：避免每次请求都重新计算
    """
    global _cached_snapshots
    if _cached_snapshots is None:
        start = time.time()
        _cached_snapshots = _generator.generate_all_snapshots()
        elapsed = (time.time() - start) * 1000
        print(f"[数据生成] 完成，耗时 {elapsed:.1f}ms")
    return _cached_snapshots


@app.route("/")
def index():
    """健康检查入口"""
    return jsonify({
        "service": "Atmosphere 3D Visualizer - Weather API",
        "version": "1.0.0",
        "status": "ok",
        "endpoints": {
            "snapshots": "/api/weather/snapshots - 获取所有5个时间快照数据",
            "single": "/api/weather/snapshot/<index> - 获取单个时间快照",
            "layer": "/api/weather/snapshot/<index>/layer/<altitude> - 获取指定海拔层数据",
            "meta": "/api/weather/meta - 获取元数据信息"
        }
    })


@app.route("/api/weather/meta")
def get_meta():
    """
    获取元数据信息
    
    返回：网格尺寸、海拔层列表、时间快照信息等配置信息
    数据流向：前端 axios 请求 -> atmosphere.ts 初始化配置
    """
    return jsonify({
        "grid_size": DataGenerator.GRID_SIZE,
        "altitudes": DataGenerator.ALTITUDES,
        "num_timestamps": DataGenerator.NUM_TIMESTAMPS,
        "timestamps": [f"T+{i * 2}h" for i in range(DataGenerator.NUM_TIMESTAMPS)],
        "descriptions": [
            "初始状态 - 平稳气象场",
            "低压中心开始形成并移动",
            "气流汇聚加强，温度梯度增大",
            "锋面过境，气象要素剧变",
            "高压中心过境，气象场趋于稳定"
        ],
        "temperature_range": [-50, 50],
        "pressure_range": [200, 1050],
        "wind_speed_range": [0, 50]
    })


@app.route("/api/weather/snapshots")
def get_all_snapshots():
    """
    获取所有5个时间快照的完整气象数据
    
    接口：GET /api/weather/snapshots
    
    返回结构：
    {
        "success": true,
        "count": 5,
        "grid_size": 20,
        "altitudes": [1000, 3000, 5000, 8000, 10000],
        "data": [
            {
                "timestamp": "T+0h",
                "timestamp_index": 0,
                "description": "...",
                "layers": [
                    {
                        "altitude": 1000,
                        "temperature": [[...], ...],  # 20x20
                        "pressure": [[...], ...],
                        "wind_u": [[...], ...],
                        "wind_v": [[...], ...],
                        "wind_speed": [[...], ...],
                        "stats": {...}
                    },
                    ...  // 共5层
                ]
            },
            ...  // 共5个时间快照
        ]
    }
    
    数据流向：
        backend/app.py -> axios -> src/main.ts -> src/atmosphere.ts (构建3D体素网格)
    """
    try:
        start_time = time.time()
        snapshots = _get_or_generate_snapshots()
        elapsed = (time.time() - start_time) * 1000

        return jsonify({
            "success": True,
            "count": len(snapshots),
            "grid_size": DataGenerator.GRID_SIZE,
            "altitudes": DataGenerator.ALTITUDES,
            "query_time_ms": round(elapsed, 2),
            "data": snapshots
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "获取气象快照数据失败"
        }), 500


@app.route("/api/weather/snapshot/<int:index>")
def get_single_snapshot(index: int):
    """
    获取单个时间快照数据
    
    接口：GET /api/weather/snapshot/0  (索引 0-4)
    """
    try:
        if index < 0 or index >= DataGenerator.NUM_TIMESTAMPS:
            return jsonify({
                "success": False,
                "error": f"时间索引 {index} 超出范围 (0-{DataGenerator.NUM_TIMESTAMPS - 1})"
            }), 400

        snapshots = _get_or_generate_snapshots()
        start_time = time.time()
        elapsed = (time.time() - start_time) * 1000

        return jsonify({
            "success": True,
            "grid_size": DataGenerator.GRID_SIZE,
            "altitudes": DataGenerator.ALTITUDES,
            "query_time_ms": round(elapsed, 2),
            "data": snapshots[index]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/weather/snapshot/<int:index>/layer/<int:altitude>")
def get_specific_layer(index: int, altitude: int):
    """
    获取指定时间快照的特定海拔层数据
    
    接口：GET /api/weather/snapshot/0/layer/5000
    
    参数：
        index: 时间快照索引 (0-4)
        altitude: 海拔高度 (必须是 1000/3000/5000/8000/10000 之一)
    """
    try:
        if index < 0 or index >= DataGenerator.NUM_TIMESTAMPS:
            return jsonify({
                "success": False,
                "error": f"时间索引 {index} 超出范围"
            }), 400

        if altitude not in DataGenerator.ALTITUDES:
            return jsonify({
                "success": False,
                "error": f"海拔 {altitude}m 不在支持列表中: {DataGenerator.ALTITUDES}"
            }), 400

        snapshots = _get_or_generate_snapshots()
        snapshot = snapshots[index]
        layer_idx = DataGenerator.ALTITUDES.index(altitude)
        layer = snapshot["layers"][layer_idx]

        start_time = time.time()
        elapsed = (time.time() - start_time) * 1000

        return jsonify({
            "success": True,
            "grid_size": DataGenerator.GRID_SIZE,
            "altitude": altitude,
            "timestamp": snapshot["timestamp"],
            "query_time_ms": round(elapsed, 2),
            "data": layer
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/weather/regenerate", methods=["POST"])
def regenerate_data():
    """
    重新生成气象数据（使用新的随机种子）
    
    接口：POST /api/weather/regenerate
    Body: {"seed": 12345} 可选
    """
    global _cached_snapshots, _generator

    try:
        body = request.get_json(silent=True) or {}
        new_seed = body.get("seed", int(time.time() * 1000) % 100000)

        print(f"[数据生成] 使用种子 {new_seed} 重新生成...")
        _generator = DataGenerator(seed=new_seed)
        _cached_snapshots = None  # 清除缓存

        snapshots = _get_or_generate_snapshots()

        return jsonify({
            "success": True,
            "seed": new_seed,
            "count": len(snapshots),
            "message": "气象数据已重新生成"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


def main():
    """启动 Flask 开发服务器"""
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")

    print("=" * 60)
    print("  大气层3D可视化 - 气象数据后端服务")
    print("=" * 60)
    print(f"  监听地址: http://{host}:{port}")
    print(f"  前端地址: http://localhost:3000")
    print()
    print("  可用接口:")
    print("    GET  /api/weather/meta         - 元数据配置")
    print("    GET  /api/weather/snapshots    - 全部快照数据")
    print("    GET  /api/weather/snapshot/0   - 单个快照")
    print("    POST /api/weather/regenerate   - 重新生成数据")
    print("=" * 60)
    print()

    # 预生成数据，减少首次请求延迟
    print("[预加载] 正在生成气象数据...")
    _get_or_generate_snapshots()
    print("[预加载] 完成！服务已就绪。")
    print()

    app.run(host=host, port=port, debug=False)


if __name__ == "__main__":
    main()
