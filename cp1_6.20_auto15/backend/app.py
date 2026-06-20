from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import time

app = Flask(__name__)
CORS(app)

CHARACTERS = ["少年", "少女", "老者", "剑客", "魔法师", "侦探", "武士", "精灵", "机械师", "旅人"]
SCENE_PREFIXES = [
    "古老的", "神秘的", "破旧的", "繁华的", "荒凉的", "幽静的", "热闹的",
    "阴暗的", "明亮的", "潮湿的"
]
SCENE_PLACES = [
    "森林深处", "城堡大厅", "城市街道", "海边悬崖", "废弃仓库", "酒馆角落",
    "山巅洞穴", "图书馆内", "工厂车间", "火车站台", "屋顶天台", "小巷深处"
]
SHOT_ANGLES = [
    "远景", "全景", "中景", "近景", "特写", "大特写",
    "俯视", "仰视", "平视", "倾斜镜头", "过肩镜头", "主观镜头"
]
DIALOGUE_TEMPLATES = [
    "「这里就是传说中的地方吗？」",
    "「我们终于到了。」",
    "「小心，前面有情况。」",
    "「别担心，有我在。」",
    "「这一切究竟是怎么回事？」",
    "「看来我们来晚了一步。」",
    "「事情变得有趣起来了。」",
    "「记住我们的约定。」",
    "「是时候做出选择了。」",
    "「真相，就藏在那扇门后。」"
]
CAMERA_DESCRIPTIONS = [
    "镜头缓缓推进，捕捉人物的细微表情变化",
    "快速切换镜头，营造紧张氛围",
    "从低角度仰视，凸显场景的压迫感",
    "缓慢平移镜头，展示环境全貌",
    "手持镜头晃动，增强临场感",
    "固定机位长镜头，记录整个场景",
    "快速拉远镜头，揭示宏大场景",
    "环绕拍摄，360度展现空间关系"
]


def generate_storyboard(text: str, num_pages: int = 5):
    storyboards = []
    for i in range(num_pages):
        character_a = random.choice(CHARACTERS)
        character_b = random.choice([c for c in CHARACTERS if c != character_a])
        scene = random.choice(SCENE_PREFIXES) + random.choice(SCENE_PLACES)
        shot_angle = random.choice(SHOT_ANGLES)
        dialogue = random.choice(DIALOGUE_TEMPLATES)
        camera = random.choice(CAMERA_DESCRIPTIONS)

        storyboards.append({
            "id": f"panel_{i + 1}",
            "pageNumber": i + 1,
            "sceneDescription": f"{scene}，{text[:20]}...",
            "characters": [
                {
                    "name": character_a,
                    "position": {"x": 20, "y": 50},
                    "facing": "right"
                },
                {
                    "name": character_b,
                    "position": {"x": 75, "y": 45},
                    "facing": "left"
                }
            ],
            "dialogue": {
                "speaker": character_a,
                "text": dialogue,
                "position": "left"
            },
            "shotAngle": shot_angle,
            "cameraDescription": camera
        })
    return storyboards


@app.route('/api/generate_storyboard', methods=['POST'])
def api_generate():
    try:
        data = request.get_json()
        text = data.get('text', '')
        num_pages = min(max(data.get('numPages', 5), 4), 6)

        if not text:
            return jsonify({"error": "请输入故事描述文本"}), 400

        time.sleep(0.8)

        storyboards = generate_storyboard(text, num_pages)

        return jsonify({
            "success": True,
            "storyboards": storyboards,
            "totalPages": num_pages
        })

    except Exception as e:
        return jsonify({"error": f"生成失败: {str(e)}"}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    print("=" * 50)
    print("  AI 漫画分镜生成后端服务启动中...")
    print("  地址: http://localhost:5000")
    print("  健康检查: http://localhost:5000/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
