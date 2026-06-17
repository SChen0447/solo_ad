from flask import Flask, jsonify
from flask_cors import CORS
import math

app = Flask(__name__)
CORS(app)


@app.route('/api/species', methods=['GET'])
def get_species():
    species_data = [
        {
            "id": "riftia",
            "name": "Riftia pachyptila",
            "common_name": "巨型管虫",
            "ecological_role": "初级消费者，化学合成共生",
            "description": "巨型管虫栖息于热液喷口附近，体内共生的化能合成细菌将硫化氢转化为有机物质，为管虫提供能量。其血红素能同时结合氧气和硫化氢，运输给体内的细菌共生体。没有口腔和消化系统，完全依赖共生体生存。",
            "depth_range": "2500-3500米",
            "temperature_tolerance": "2-30°C"
        },
        {
            "id": "shrimp",
            "name": "Rimicaris exoculata",
            "common_name": "盲虾",
            "ecological_role": "杂食性清道夫，初级消费者",
            "description": "盲虾栖息于热液喷口烟囱壁上，背部有感光器官可探测微弱的热辐射。它们以化能合成细菌为食，并与丝状细菌形成共生关系。成群活动，在喷口周围形成密集的生物群落。",
            "depth_range": "2300-3800米",
            "temperature_tolerance": "2-45°C"
        },
        {
            "id": "mussel",
            "name": "Bathymodiolus thermophilus",
            "common_name": "深海贻贝",
            "ecological_role": "过滤性摄食者，兼性共生",
            "description": "深海贻贝密集分布在热液喷口周围的岩石缝隙中，鳃组织内含有共生的化能合成细菌。它们既可以通过过滤海水获取食物，也可以依赖共生细菌提供的营养。其足丝能牢固附着在岩石表面。",
            "depth_range": "2000-3300米",
            "temperature_tolerance": "3-25°C"
        },
        {
            "id": "octopus",
            "name": "Vulcanoctopus hydrothermalis",
            "common_name": "热液章鱼",
            "ecological_role": "顶级捕食者",
            "description": "热液章鱼是深海热液生态系统中的顶级捕食者，主要以盲虾和小型甲壳类为食。身体半透明粉红色，适应完全黑暗的深海环境，拥有发达的触觉和化学感受器。是目前已知唯一栖息于热液喷口区域的章鱼种类。",
            "depth_range": "2200-3600米",
            "temperature_tolerance": "2-20°C"
        },
        {
            "id": "vent",
            "name": "深海热液喷口",
            "common_name": "黑烟囱",
            "ecological_role": "能量来源，栖息地构建者",
            "description": "热液喷口是海底地壳裂缝，过热的富矿物流体从地球内部喷出。当高温（300-400°C）的还原性流体与冷海水相遇时，溶解的金属硫化物快速沉淀，形成高耸的烟囱状结构。整个热液生态系统的能量基础即来源于此。",
            "depth_range": "1500-4200米",
            "temperature_tolerance": "喷口中心可达380°C以上"
        }
    ]
    return jsonify(species_data)


@app.route('/api/plume', methods=['GET'])
def get_plume():
    plume_config = {
        "particle_count": 1200,
        "velocity_base": 2.5,
        "velocity_variation": 0.8,
        "particle_size_min": 0.5,
        "particle_size_max": 3.0,
        "temperature_center": 350,
        "temperature_edge": 5,
        "color_center": [1.0, 0.27, 0.0],
        "color_edge": [0.1, 0.1, 0.25],
        "lifetime": 6.0,
        "spread_angle": 0.35,
        "chemical_composition": {
            "hydrogen_sulfide": "6.5 mmol/kg",
            "methane": "1.2 mmol/kg",
            "hydrogen": "0.8 mmol/kg",
            "iron": "2.3 mmol/kg",
            "manganese": "0.4 mmol/kg",
            "silica": "18.5 mmol/kg"
        },
        "temperature_range": "30°C - 380°C",
        "ph_range": "2.0 - 5.5"
    }
    return jsonify(plume_config)


@app.route('/api/scenario', methods=['GET'])
def get_scenario():
    waypoints = []
    for i in range(20):
        t = i / 19
        angle = t * math.pi * 2
        radius = 18 + math.sin(t * math.pi * 4) * 4
        height = -2 + t * 55
        x = math.cos(angle) * radius
        z = math.sin(angle) * radius
        waypoints.append({
            "position": [round(x, 2), round(height, 2), round(z, 2)],
            "lookAt": [0, 10, 0],
            "narration": generate_narration(i, t, height)
        })
    cruise_data = {
        "waypoints": waypoints,
        "speed": 3.5,
        "total_duration": 180,
        "path_visible": True,
        "path_color": [0.3, 0.6, 1.0],
        "path_opacity": 0.35
    }
    return jsonify(cruise_data)


def generate_narration(index: int, t: float, height: float) -> str:
    narrations = [
        "深潜器正在接近深海热液喷口区域，当前深度约2500米。准备下降观测。",
        "正在穿越上层冷水域，温度约2°C。注意观察下方出现的热液羽流痕迹。",
        "已观测到明显的热液柱结构，红色中心区温度超过300°C，请小心接近。",
        "下方岩石区域密集分布着深海贻贝群落，它们依靠共生细菌获取能量。",
        "注意左前方！一群盲虾正在烟囱壁上爬行，其背部感光器官可探测热辐射。",
        "接近巨型管虫群，这些生物可长达2米，完全依赖体内共生的化能合成细菌。",
        "管虫红色羽状触手正在摆动，用于吸收硫化氢和氧气。请保持观察距离。",
        "正在上升观察热液柱扩散情况，颗粒物正随洋流飘向远方。",
        "警告：右侧岩石缝隙中可能藏有热液章鱼，这是该区域的顶级捕食者。",
        "观测到热液章鱼伸出触手！它正在伺机捕食经过的盲虾。",
        "深潜器已到达巡航最高点，可俯瞰整个热液喷口生态系统全貌。",
        "现在开始缓慢下降，让我们更仔细地观察生物群落的分布格局。",
        "注意温度变化：从喷口中心向外围，温度梯度极其陡峭。",
        "化学传感器显示：硫化氢浓度在喷口附近极高，这是化能合成的能量来源。",
        "再次经过管虫群落，它们的生长速度在深海生物中极为惊人。",
        "成群的盲虾感受到深潜器靠近，正在加速分散。",
        "贻贝群紧紧附着在岩石缝隙中，足丝的附着强度令人惊叹。",
        "热液柱中的矿物质正在沉淀，这些黑烟囱正是这样逐年增高的。",
        "接近巡航终点，本次观测收集到丰富的生态数据。",
        "深潜器自动巡航结束，切换至自由探索模式继续研究。"
    ]
    if index < len(narrations):
        return narrations[index]
    return f"当前深度 {2500 + int(height * 10)} 米，继续探索深海奥秘"


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
