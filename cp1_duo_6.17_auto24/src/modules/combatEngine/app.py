from flask import Flask, request, jsonify
from flask_cors import CORS
from combat_logic import CombatSimulator

app = Flask(__name__)
CORS(app)


@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.get_json()
        characters = data.get('characters', [])
        monsters = data.get('monsters', [])
        max_rounds = data.get('maxRounds', 100)

        if not characters or not monsters:
            return jsonify({
                'success': False,
                'error': '需要至少一个角色和一个怪物才能开始战斗'
            }), 400

        if len(characters) > 4 or len(monsters) > 4:
            return jsonify({
                'success': False,
                'error': '每队最多4个单位'
            }), 400

        simulator = CombatSimulator(characters, monsters, max_rounds)
        result = simulator.simulate()

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
