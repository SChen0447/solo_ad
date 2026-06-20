import random
import time
from typing import Dict, List, Any

DIAGNOSIS_RULES: Dict[str, Dict[str, Any]] = {
    "白粉病": {
        "symptoms": ["霉斑", "黄化", "卷曲"],
        "description": "叶片表面出现白色粉状霉层，严重时叶片枯黄脱落。由真菌引起，在高湿环境下易爆发。",
        "treatment": "1. 及时剪除并销毁病叶，减少传染源；\n2. 使用石硫合剂或硫磺粉喷洒，每隔7-10天一次；\n3. 保持植株通风透光，避免过度密植；\n4. 控制湿度，避免叶面长时间积水。",
        "severity": "medium"
    },
    "叶斑病": {
        "symptoms": ["叶斑", "黄化", "枯梢"],
        "description": "叶片出现圆形或不规则褐色斑点，逐渐扩大导致叶片枯死。由细菌或真菌感染引起。",
        "treatment": "1. 及时清除病叶并集中销毁；\n2. 使用代森锰锌或多菌灵喷洒叶面；\n3. 避免浇水时直接淋洒叶片；\n4. 增施磷钾肥，提高植株抗病能力。",
        "severity": "medium"
    },
    "蚜虫虫害": {
        "symptoms": ["虫蛀", "卷曲", "黄化", "畸形"],
        "description": "蚜虫群集在嫩叶和嫩梢上吸食汁液，导致叶片卷曲、变形，并分泌蜜露引发煤污病。",
        "treatment": "1. 用高压水冲洗叶片去除蚜虫；\n2. 使用吡虫啉或苦参碱喷雾防治；\n3. 保护瓢虫、草蛉等天敌；\n4. 悬挂黄色粘虫板诱杀有翅蚜。",
        "severity": "low"
    },
    "根腐病": {
        "symptoms": ["萎蔫", "黄化", "枯梢"],
        "description": "根系腐烂变褐，植株整体萎蔫，叶片发黄脱落。由土壤积水和病原菌感染共同引起。",
        "treatment": "1. 及时挖出病株，切除腐烂根系；\n2. 用多菌灵或恶霉灵浸泡根部消毒；\n3. 更换疏松透气的新土；\n4. 控制浇水量，确保排水良好。",
        "severity": "high"
    },
    "霜霉病": {
        "symptoms": ["霉斑", "叶斑", "黄化", "萎蔫"],
        "description": "叶片背面出现灰紫色霉层，正面有黄色多角形病斑。低温高湿条件下发病迅速。",
        "treatment": "1. 彻底清除病残体并集中销毁；\n2. 使用普力克或甲霜灵喷雾防治；\n3. 加强通风，降低空气湿度；\n4. 采用地膜覆盖，减少土面水分蒸发。",
        "severity": "high"
    },
    "红蜘蛛虫害": {
        "symptoms": ["虫蛀", "黄化", "枯梢", "畸形"],
        "description": "叶背出现针尖大小的红色虫点，叶片失绿变黄，严重时叶片枯焦脱落。",
        "treatment": "1. 用清水冲洗叶片背面，冲走虫体；\n2. 使用阿维菌素或哒螨灵喷雾；\n3. 增加环境湿度，抑制红蜘蛛繁殖；\n4. 保护捕食螨等天敌昆虫。",
        "severity": "medium"
    },
    "灰霉病": {
        "symptoms": ["霉斑", "枯梢", "萎蔫", "畸形"],
        "description": "受害部位出现灰褐色霉层，组织腐烂坏死。花朵、果实和嫩梢最易受感染。",
        "treatment": "1. 及时摘除病花、病果和病叶；\n2. 使用腐霉利或异菌脲喷雾；\n3. 控制种植密度，保持通风；\n4. 避免在傍晚浇水，减少夜间结露。",
        "severity": "high"
    },
    "病毒病": {
        "symptoms": ["畸形", "黄化", "卷曲", "萎蔫"],
        "description": "叶片出现黄绿相间的花叶症状，植株矮化、叶片皱缩畸形。由昆虫传播或接触传播。",
        "treatment": "1. 及时拔除并销毁病株，防止传染；\n2. 防治蚜虫、粉虱等传毒媒介；\n3. 喷施病毒A或植病灵减轻症状；\n4. 选用抗病品种，工具注意消毒。",
        "severity": "high"
    }
}

SYMPTOM_KEYWORDS = [
    "叶斑", "黄化", "卷曲", "霉斑", "虫蛀", "枯梢", "萎蔫", "畸形"
]

PLANT_IMAGE_BASE64 = (
    "data:image/svg+xml;base64,"
    "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZBRjBFNiIvPgogIDxlbGxpcHNlIGN4PSIxMDAiIGN5PSIxNTAiIHJ4PSI0MCIgcnk9IjI1IiBmaWxsPSIjOUI3NjU2Ii8+CiAgPHBhdGggZD0iTTEwMCAxNTAgTDgwIDgwIFE2MCA2MCA3MCA0MCBROTAgNTAgMTAwIDgwIiBmaWxsPSIjNTVEQjJGIiBvcGFjaXR5PSIwLjgiLz4KICA8cGF0aCBkPSJNMTAwIDE1MCBMMTIwIDgwIFFMTQwIDYwIDEzMCA0MCBRMTEwIDUwIDEwMCA4MCIgZmlsbD0iIzU1QkMyRiIgb3BhY2l0eT0iMC44Ii8+CiAgPHBhdGggZD0iTTEwMCAxNTAgTDEwMCA2MCBRODAgNDAgOTAgMjAgUTExMCAzMCAxMDAgNjAiIGZpbGw9IiM0RjlBNDYiLz4KPC9zdmc+"
)


def _match_symptoms(symptoms: List[str]) -> Dict[str, int]:
    scores: Dict[str, int] = {}
    for disease, rule in DIAGNOSIS_RULES.items():
        match_count = len(set(symptoms) & set(rule["symptoms"]))
        scores[disease] = match_count
    return scores


def diagnose(symptoms: List[str], temperature: float, humidity: float, light_hours: float) -> Dict[str, Any]:
    time.sleep(random.uniform(1.0, 2.0))
    
    scores = _match_symptoms(symptoms)
    sorted_diseases = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    if not sorted_diseases or sorted_diseases[0][1] == 0:
        return {
            "disease": "未识别病害",
            "confidence": random.randint(30, 50),
            "description": "根据当前症状无法确定具体病害，建议观察更多症状后重新诊断。",
            "treatment": "1. 持续观察植株变化，记录新出现的症状；\n2. 检查水分、光照和施肥是否合理；\n3. 若症状加重，可咨询专业园艺人员。",
            "severity": "unknown",
            "image": PLANT_IMAGE_BASE64
        }
    
    top_disease, match_count = sorted_diseases[0]
    rule = DIAGNOSIS_RULES[top_disease]
    
    base_confidence = 50 + match_count * 15
    env_factor = 0
    if humidity > 70:
        env_factor += 10
    if temperature > 28:
        env_factor += 5
    if light_hours < 4:
        env_factor += 5
    
    confidence = min(99, base_confidence + env_factor + random.randint(-5, 5))
    
    return {
        "disease": top_disease,
        "confidence": confidence,
        "description": rule["description"],
        "treatment": rule["treatment"],
        "severity": rule["severity"],
        "image": PLANT_IMAGE_BASE64
    }


def generate_sample_cases() -> List[Dict[str, Any]]:
    sample_plants = [
        {"plant_name": "月季", "symptoms": ["霉斑", "黄化", "卷曲"]},
        {"plant_name": "番茄", "symptoms": ["叶斑", "黄化", "枯梢"]},
        {"plant_name": "玫瑰", "symptoms": ["虫蛀", "卷曲", "黄化"]},
        {"plant_name": "绿萝", "symptoms": ["萎蔫", "黄化"]},
        {"plant_name": "黄瓜", "symptoms": ["霉斑", "叶斑", "黄化"]},
    ]
    cases = []
    for i, sp in enumerate(sample_plants):
        temp = random.uniform(18, 32)
        hum = random.uniform(40, 90)
        light = random.uniform(2, 10)
        diag = diagnose(sp["symptoms"], temp, hum, light)
        cases.append({
            "id": f"sample-{i}",
            "plant_name": sp["plant_name"],
            "symptoms": sp["symptoms"],
            "temperature": round(temp, 1),
            "humidity": round(hum, 1),
            "light_hours": round(light, 1),
            "image": PLANT_IMAGE_BASE64,
            "diagnosis": diag,
            "likes": random.randint(0, 50),
            "comments": [
                {"id": f"c-{i}-0", "author": "园艺爱好者", "content": "我家的也有这个问题，感谢分享！", "timestamp": time.time() - 3600 * (i + 1)}
            ],
            "timestamp": time.time() - 86400 * (i + 1)
        })
    return cases
