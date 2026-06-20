import json
import random
import uuid
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

with open('level_data.json', 'r', encoding='utf-8') as f:
    level_data = json.load(f)

with open('card_data.json', 'r', encoding='utf-8') as f:
    card_data = json.load(f)

enhancement_types = ["damage", "range", "duration", "manaReduction"]

type_descriptions = {
    "damage": "伤害",
    "range": "射程",
    "duration": "持续时间",
    "manaReduction": "法力消耗减少"
}

def generate_enhancement_option(card_id=None):
    enh_type = random.choice(enhancement_types)
    value = random.randint(1, 10)
    
    if card_id is None:
        card_id = "all"
        card_name = "所有卡牌"
    else:
        card = next((c for c in card_data if c["id"] == card_id), None)
        card_name = card["name"] if card else card_id
    
    description = f"{card_name}的{type_descriptions[enh_type]} +{value}"
    
    return {
        "id": str(uuid.uuid4()),
        "cardId": card_id,
        "type": enh_type,
        "value": value,
        "description": description
    }

@app.route('/api/level/<level>', methods=['GET'])
def get_level(level):
    level_info = level_data.get(level)
    if level_info:
        return jsonify(level_info)
    return jsonify({"error": f"Level {level} not found"}), 404

@app.route('/api/cards', methods=['GET'])
def get_cards():
    return jsonify(card_data)

@app.route('/api/enhance-options', methods=['GET'])
def get_enhance_options():
    options = []
    card_ids = [card["id"] for card in card_data]
    
    for _ in range(3):
        if random.random() < 0.3:
            option = generate_enhancement_option(None)
        else:
            random_card = random.choice(card_ids)
            option = generate_enhancement_option(random_card)
        options.append(option)
    
    return jsonify(options)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
