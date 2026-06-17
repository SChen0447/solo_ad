import random
import base64
from typing import Dict, Any, Tuple

COMPONENT_TYPES = ['button', 'icon', 'card', 'input', 'label']

def generate_random_color() -> str:
    """生成随机十六进制颜色字符串"""
    return f'#{random.randint(0, 0xFFFFFF):06x}'

def extract_component_properties(
    image_base64: str,
    bbox: Tuple[int, int, int, int]
) -> Dict[str, Any]:
    """
    模拟图像分割和属性提取函数
    
    数据流向：被routes.py调用 → 返回属性
    
    Args:
        image_base64: base64编码的图像数据
        bbox: 框选坐标 (x, y, width, height)
        
    Returns:
        包含组件属性的字典
    """
    x, y, width, height = bbox
    
    component_type = random.choice(COMPONENT_TYPES)
    primary_color = generate_random_color()
    border_radius = random.randint(0, 20)
    
    return {
        'type': component_type,
        'color': primary_color,
        'width': width,
        'height': height,
        'borderRadius': border_radius,
        'x': x,
        'y': y
    }

def analyze_image_colors(image_base64: str) -> Dict[str, Any]:
    """
    分析图像主色调（模拟实现）
    """
    return {
        'dominantColor': generate_random_color(),
        'palette': [generate_random_color() for _ in range(5)]
    }
