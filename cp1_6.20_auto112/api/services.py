import math
from datetime import datetime, timedelta, timezone
from .config import Config

def calculate_pricing(
    base_price: float,
    coefficient: float,
    quantity: int,
    default_duration: int
) -> dict:
    quantity = max(1, int(quantity))
    total_price = round(
        base_price * coefficient * (quantity ** Config.PRICE_QUANTITY_EXPONENT), 2
    )
    estimated_days = default_duration + (quantity // Config.DURATION_QUANTITY_STEP)
    estimated_finish = (datetime.now(timezone.utc) + timedelta(days=estimated_days)).date()
    return {
        'totalPrice': total_price,
        'estimatedDays': estimated_days,
        'estimatedFinishDate': estimated_finish.isoformat()
    }

def generate_order_number() -> str:
    now = datetime.now(timezone.utc)
    timestamp = now.strftime('%Y%m%d%H%M%S')
    micro = str(now.microsecond)[:3]
    return f'ORD{timestamp}{micro}'

def row_to_dict(row, exclude=None):
    exclude = exclude or set()
    return {k: v for k, v in dict(row).items() if k not in exclude}

def status_display_map() -> dict:
    return {
        'pending': {'label': '待确认', 'color': '#f39c12', 'cssVar': 'status-pending'},
        'production': {'label': '生产中', 'color': '#3498db', 'cssVar': 'status-production'},
        'quality': {'label': '质检', 'color': '#9b59b6', 'cssVar': 'status-quality'},
        'shipping': {'label': '配送', 'color': '#2ecc71', 'cssVar': 'status-shipping'},
        'completed': {'label': '完成', 'color': '#95a5a6', 'cssVar': 'status-completed'},
    }
