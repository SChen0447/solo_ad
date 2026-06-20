from flask import Flask, request, jsonify
from flask_cors import CORS
from generator import DungeonGenerator, FightCalculator
import time
import functools

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "max_age": 3600}})

cache = {}

def cache_result(timeout: int = 300):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            if key in cache:
                result, timestamp = cache[key]
                if time.time() - timestamp < timeout:
                    return result
            result = func(*args, **kwargs)
            cache[key] = (result, time.time())
            return result
        return wrapper
    return decorator

@app.route('/api/generateLevel', methods=['POST'])
def generate_level():
    start_time = time.time()
    
    try:
        data = request.get_json(force=True)
        
        seed = data.get('seed')
        difficulty = data.get('difficulty', 1)
        floor = data.get('floor', 1)
        
        if not isinstance(difficulty, (int, float)) or difficulty < 1:
            difficulty = 1
        if not isinstance(floor, (int, float)) or floor < 1:
            floor = 1
        
        difficulty = min(5, max(1, int(difficulty)))
        floor = max(1, int(floor))
        
        effective_difficulty = min(5, difficulty + (floor - 1) * 0.5)
        
        generator = DungeonGenerator(seed=seed)
        result = generator.generate(difficulty=int(effective_difficulty))
        
        elapsed = time.time() - start_time
        if elapsed > 0.5:
            app.logger.warning(f"地牢生成耗时: {elapsed:.3f}s")
        
        return jsonify(result), 200
        
    except Exception as e:
        app.logger.error(f"生成地牢失败: {str(e)}")
        return jsonify({
            'error': 'generation_failed',
            'message': f'地牢生成失败: {str(e)}'
        }), 500

@app.route('/api/fight', methods=['POST'])
def fight():
    start_time = time.time()
    
    try:
        data = request.get_json(force=True)
        
        player_attack = data.get('playerAttack')
        monster_defense = data.get('monsterDefense')
        monster_hp = data.get('monsterHp')
        player_hp = data.get('playerHp')
        monster_attack = data.get('monsterAttack')
        
        required_fields = ['playerAttack', 'monsterDefense', 'monsterHp', 'playerHp', 'monsterAttack']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'error': 'missing_fields',
                'message': f'缺少必要字段: {", ".join(missing_fields)}'
            }), 400
        
        for field in required_fields:
            if not isinstance(data[field], (int, float)):
                return jsonify({
                    'error': 'invalid_type',
                    'message': f'字段 {field} 必须是数字'
                }), 400
        
        if player_attack < 0 or monster_defense < 0 or monster_hp < 0 or player_hp < 0 or monster_attack < 0:
            return jsonify({
                'error': 'negative_value',
                'message': '数值不能为负数'
            }), 400
        
        calculator = FightCalculator(seed=int(time.time() * 1000) % 100000)
        result = calculator.calculate(
            player_attack=int(player_attack),
            monster_defense=int(monster_defense),
            monster_hp=int(monster_hp),
            player_hp=int(player_hp),
            monster_attack=int(monster_attack)
        )
        
        elapsed = time.time() - start_time
        if elapsed > 0.5:
            app.logger.warning(f"战斗结算耗时: {elapsed:.3f}s")
        
        return jsonify(result), 200
        
    except Exception as e:
        app.logger.error(f"战斗结算失败: {str(e)}")
        return jsonify({
            'error': 'fight_failed',
            'message': f'战斗结算失败: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': time.time(),
        'version': '1.0.0'
    }), 200

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'error': 'not_found',
        'message': '请求的接口不存在'
    }), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({
        'error': 'method_not_allowed',
        'message': '请求方法不允许'
    }), 405

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
