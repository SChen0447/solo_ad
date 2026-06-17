import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PRESETS_FILE = os.path.join(os.path.dirname(__file__), 'presets.json')

DEFAULT_PRESETS = {
    "spiral": {
        "name": "螺旋星云",
        "icon": "🌀",
        "parameters": {
            "particleCount": 20000,
            "rotationSpeed": 1.5,
            "colorOffset": 0,
            "noiseStrength": 0.4,
            "spreadRadius": 6,
            "backgroundColor": "#0a0515",
            "spiralArms": 4,
            "spiralTightness": 0.8,
            "pulseSpeed": 0.5,
            "pulseIntensity": 0.2
        }
    },
    "ring": {
        "name": "环状星云",
        "icon": "💫",
        "parameters": {
            "particleCount": 25000,
            "rotationSpeed": 2.0,
            "colorOffset": 180,
            "noiseStrength": 0.2,
            "spreadRadius": 7,
            "backgroundColor": "#050a15",
            "ringThickness": 0.3,
            "ringRadius": 5,
            "pulseSpeed": 0.8,
            "pulseIntensity": 0.3
        }
    },
    "diffuse": {
        "name": "弥漫星云",
        "icon": "🌌",
        "parameters": {
            "particleCount": 30000,
            "rotationSpeed": 0.5,
            "colorOffset": 280,
            "noiseStrength": 0.8,
            "spreadRadius": 8,
            "backgroundColor": "#0a0a1e",
            "cloudDensity": 0.6,
            "pulseSpeed": 0.3,
            "pulseIntensity": 0.15
        }
    }
}


def load_presets():
    if not os.path.exists(PRESETS_FILE):
        with open(PRESETS_FILE, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_PRESETS, f, ensure_ascii=False, indent=2)
        return DEFAULT_PRESETS
    
    with open(PRESETS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data


def save_presets(presets):
    with open(PRESETS_FILE, 'w', encoding='utf-8') as f:
        json.dump(presets, f, ensure_ascii=False, indent=2)


@app.route('/api/presets', methods=['GET'])
def get_presets():
    presets = load_presets()
    return jsonify(presets)


@app.route('/api/save', methods=['POST'])
def save_preset():
    try:
        data = request.get_json()
        preset_name = data.get('name', '')
        parameters = data.get('parameters', {})
        
        if not preset_name:
            return jsonify({"success": False, "message": "预设名称不能为空"}), 400
        
        presets = load_presets()
        
        preset_key = f"custom_{preset_name.replace(' ', '_').lower()}"
        
        presets[preset_key] = {
            "name": preset_name,
            "icon": "⭐",
            "parameters": parameters,
            "custom": True
        }
        
        save_presets(presets)
        
        return jsonify({
            "success": True,
            "message": "预设保存成功",
            "key": preset_key,
            "preset": presets[preset_key]
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
