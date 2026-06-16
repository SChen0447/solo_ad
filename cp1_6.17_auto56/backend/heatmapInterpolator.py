import math
import random
from typing import List, Dict, Tuple, Optional


class HeatmapInterpolator:
    def __init__(self, power: float = 2.0):
        self.power = power

    def inverse_distance_weighting(
        self,
        sample_points: List[Dict],
        target_points: List[Dict],
        radius: float = 50.0
    ) -> Dict[int, float]:
        result = {}

        for target in target_points:
            target_id = target['id']
            target_x = target['x']
            target_z = target['z']

            weighted_sum = 0.0
            weight_total = 0.0

            for sample in sample_points:
                sample_x = sample['x']
                sample_z = sample['z']
                sample_value = sample['value']

                distance = math.sqrt(
                    (target_x - sample_x) ** 2 +
                    (target_z - sample_z) ** 2
                )

                if distance < 0.001:
                    result[target_id] = sample_value
                    break

                if distance > radius:
                    continue

                weight = 1.0 / (distance ** self.power)
                weighted_sum += weight * sample_value
                weight_total += weight

            if target_id not in result:
                if weight_total > 0:
                    result[target_id] = weighted_sum / weight_total
                else:
                    result[target_id] = 0.0

        return result

    def generate_sample_points(
        self,
        grid_data: List[Dict],
        num_samples: int = 15,
        value_range: Tuple[int, int] = (10, 95)
    ) -> List[Dict]:
        sample_points = []

        grid_xs = [b['x'] for b in grid_data]
        grid_zs = [b['z'] for b in grid_data]
        min_x, max_x = min(grid_xs), max(grid_xs)
        min_z, max_z = min(grid_zs), max(grid_zs)

        selected_buildings = random.sample(grid_data, min(num_samples, len(grid_data)))

        for building in selected_buildings:
            sample_points.append({
                'x': building['x'],
                'z': building['z'],
                'value': random.uniform(value_range[0], value_range[1])
            })

        extra_samples = max(0, num_samples - len(selected_buildings))
        for _ in range(extra_samples):
            sample_points.append({
                'x': random.uniform(min_x, max_x),
                'z': random.uniform(min_z, max_z),
                'value': random.uniform(value_range[0], value_range[1])
            })

        return sample_points

    def interpolate_grid(
        self,
        grid_data: List[Dict],
        layer_type: str,
        radius: float = 50.0
    ) -> Dict[int, float]:
        value_ranges = {
            'energy': (20, 95),
            'traffic': (15, 90),
            'green': (10, 85)
        }
        value_range = value_ranges.get(layer_type, (10, 90))

        sample_points = self.generate_sample_points(
            grid_data,
            num_samples=12,
            value_range=value_range
        )

        target_points = [
            {'id': b['id'], 'x': b['x'], 'z': b['z']}
            for b in grid_data
        ]

        interpolated = self.inverse_distance_weighting(
            sample_points,
            target_points,
            radius
        )

        return {k: max(0, min(100, v)) for k, v in interpolated.items()}
